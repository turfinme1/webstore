const bcrypt = require("bcrypt");
const { STATUS_CODES }  = require("../serverConfigurations/constants");

class CrudService {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.buildFilteredPaginatedQuery =
      this.buildFilteredPaginatedQuery.bind(this);
  }

  async create(data) {
    const schema = data.entitySchemaCollection[data.params.entity];

    // Hash the password if it exists
    if (data.body.password_hash) {
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    }

    // Insert the main entity and return its ID
    const insertedEntity = await this.insertMainEntity(data, schema);

    // Handle insertions into mapping tables
    await this.handleMappingInsertions(data, schema, insertedEntity.id);

    return insertedEntity; // Return the created main entity
  }

  async insertMainEntity(data, schema) {
    const keys = Object.keys(schema.properties);
    const mainEntityValues = keys
      .filter(
        (key) => schema.properties[key] && !schema.properties[key]?.insertConfig
      ) // Exclude properties with insertConfig
      .map((key) => data.body[key]);

    const insertQuery = `INSERT INTO ${schema.table}(${keys
      .filter(
        (key) => schema.properties[key] && !schema.properties[key]?.insertConfig
      )
      .join(",")}) VALUES(${mainEntityValues
      .map((_, i) => `$${i + 1}`)
      .join(",")}) RETURNING *`;

    const result = await data.dbConnection.query(insertQuery, mainEntityValues);
    return result.rows[0]; // The newly created main entity
  }

  async handleMappingInsertions(data, schema, mainEntityId) {
    const keys = Object.keys(schema.properties);

    for (const key of keys) {
      const property = schema.properties[key];

      if (property?.insertConfig?.type === "mapping_table" && data.body[key] && Array.isArray(data.body[key]) && data.body[key].length > 0) {
        const { insertConfig } = property;
        const mappingTable = insertConfig.table;
        const foreignKey = insertConfig.foreignKey;
        const mappingKey = insertConfig.mappingKey;

        // // Prepare the data to insert into the mapping table
        // const mappingValues = data.body[key].map((value) => ({
        //   [foreignKey]: mainEntityId,
        //   [mappingKey]: value,
        // }));

        // // Insert each entry into the mapping table
        // for (const mapping of mappingValues) {
        //   const columns = Object.keys(mapping).join(", ");
        //   const values = Object.values(mapping);
        //   const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        //   const mappingQuery = `INSERT INTO ${mappingTable} (${columns}) VALUES (${placeholders})`;
        //   await data.dbConnection.query(mappingQuery, values);
        // }

        // Create arrays for each column
        const foreignKeys = Array(data.body[key].length).fill(mainEntityId);
        const mappingValues = data.body[key];

        // Build UNNEST query for bulk insert
        const query = `
          INSERT INTO ${mappingTable} (${foreignKey}, ${mappingKey})
          SELECT * FROM UNNEST ($1::bigint[], $2::bigint[])
        `;

        await data.dbConnection.query(query, [foreignKeys, mappingValues]);
      }
    }
  }

  async getFilteredPaginated(data) {
    const builtQuery = this.buildFilteredPaginatedQuery(data);
    const offset = (data.query.page - 1) * data.query.pageSize;
    const paginatedQuery = `${builtQuery.query} LIMIT $${
      builtQuery.searchValues.length + 1
    } OFFSET $${builtQuery.searchValues.length + 2}`;

    const totalCount = await data.dbConnection.query(
      builtQuery.aggregatedTotalQuery,
      builtQuery.searchValues
    );
    const result = await data.dbConnection.query(paginatedQuery, [
      ...builtQuery.searchValues,
      data.query.pageSize,
      offset,
    ]);
    
    return {
      result: result.rows,
      count: totalCount.rows[0].total_rows,
      groupCount: totalCount.rows[0]?.total_count,
      aggregationResults: totalCount.rows[0],
    };
  }

  buildFilteredPaginatedQuery(data, isExport = false) {
    const schema = data.entitySchemaCollection[data.params.entity];
    const view = isExport ? schema.export_view : schema.views;
    let searchValues = [];
    let conditions = [];
    let selectFields = [];
    let groupBySets = [];
    let orderByClause = "";
    let appliedFilters = {};
    let appliedGroups = {};

    if (data.query.filterParams) {
      for (const [filterField, filterValue] of Object.entries(
        data.query.filterParams
      )) {
        appliedFilters[filterField] = filterValue;

        if (Array.isArray(filterValue)) {
          const filterPlaceholders = filterValue
          .map((_, index) => `STRPOS(LOWER(CAST(${filterField} AS text)), LOWER($${searchValues.length + index + 1})) > 0`)
          .join(" OR ");
          searchValues.push(...filterValue);
          conditions.push(`(${filterPlaceholders})`);
        } else if (schema.properties[filterField]?.format === "date-time") {
          if (filterValue.min && filterValue.max) {
            searchValues.push(filterValue.min);
            searchValues.push(filterValue.max);
            conditions.push(
              `${filterField} >= $${searchValues.length - 1} 
              AND ${filterField} <= $${searchValues.length}`
            );
          } else if (filterValue.min) {
            searchValues.push(filterValue.min);
            conditions.push(
              `${filterField} >= $${searchValues.length}`
            );
          } else if (filterValue.max) {
            searchValues.push(filterValue.max);
            conditions.push(
              `${filterField} <= $${searchValues.length}`
            );
          } else {
            searchValues.push(filterValue);
            conditions.push(
              `${filterField} = $${searchValues.length}`
            );
          }
        } else if (schema.properties[filterField]?.format === "date-time") {
          if (filterValue.min && filterValue.max) {
            searchValues.push(filterValue.min);
            searchValues.push(filterValue.max);
            conditions.push(
              `DATE_TRUNC('day', ${filterField}) >= $${
                searchValues.length - 1
              } AND DATE_TRUNC('day', ${filterField}) <= $${
                searchValues.length
              }`
            );
          } else if (filterValue.min) {
            searchValues.push(filterValue.min);
            conditions.push(
              `DATE_TRUNC('day', ${filterField}) >= $${searchValues.length}`
            );
          } else if (filterValue.max) {
            searchValues.push(filterValue.max);
            conditions.push(
              `DATE_TRUNC('day', ${filterField}) <= $${searchValues.length}`
            );
          } else {
            searchValues.push(filterValue);
            conditions.push(
              `DATE_TRUNC('day', ${filterField}) = $${searchValues.length}`
            );
          }
        } else if (schema.properties[filterField]?.format === "date-time-no-year") {
          searchValues.push(filterValue);
          conditions.push(
            `(EXTRACT(MONTH FROM ${filterField}), EXTRACT(DAY FROM ${filterField})) = 
            (EXTRACT(MONTH FROM $${searchValues.length}::date), EXTRACT(DAY FROM $${searchValues.length}::date))`
          );
        } else if (schema.properties[filterField]?.format === "date-range-overlap") {
          
        } else if (typeof filterValue === "string") {
          searchValues.push(`${filterValue}`);
          conditions.push(
            `STRPOS(LOWER(CAST(${filterField} AS text)), LOWER($${searchValues.length})) > 0`
          ); 
        } else if (typeof filterValue === "object") {
          if (filterValue.min) {
            searchValues.push(filterValue.min);
            conditions.push(`${filterField} >= $${searchValues.length}`);
          }
          if (filterValue.max) {
            searchValues.push(filterValue.max);
            conditions.push(`${filterField} <= $${searchValues.length}`);
          }
        } else {
          searchValues.push(filterValue);
          conditions.push(`${filterField} = $${searchValues.length}`);
        }
      }
    }

    if (data.query.groupParams) {
      for (const groupField of data.query.groupParams) {
        const fieldConfig = schema.properties[groupField.column];
        if (fieldConfig?.groupable) {
          if (fieldConfig.format === "date-time") {
            const fieldAlias = `${fieldConfig.aggregation}('${groupField.granularity}', ${groupField.column})`;
            groupBySets.push(fieldAlias);
            selectFields.push(`${fieldAlias} AS ${groupField.column}`);
            appliedGroups[groupField.column] = `${groupField.column}-${groupField.granularity}`;
          } else {
            groupBySets.push(groupField.column);
            selectFields.push(groupField.column);
            appliedGroups[groupField.column] = groupField.column;
          }
        }
      }

      for (const [key, value] of Object.entries(schema.properties)) {
        if (value.group_behavior) {
          selectFields.push(`${value.group_behavior}(${key}) AS ${key}`);
        }
      }

      selectFields.push("COUNT(*) AS count");
    }

    if (groupBySets.length > 0) {
      let orderByCaluseFields = groupBySets.map((field) => `${field} DESC`).join(", ");
      orderByClause = ` ${orderByCaluseFields}`;
    } else {
      selectFields = ["*"];
      orderByClause =
        data.query.orderParams.length > 0
          ? data.query.orderParams
              .map(
                ([column, direction]) => `${column} ${direction.toUpperCase()}`
              )
              .join(", ")
          : "id ASC";
    }

    const combinedConditions =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const groupingClause =
      groupBySets.length > 0
        ? `GROUP BY GROUPING SETS ((${groupBySets.join(", ")}))`
        : "";

    const query = `
      SELECT ${selectFields.join(", ")}
      FROM ${view} 
      ${combinedConditions}
      ${groupingClause}
      ORDER BY ${orderByClause}`;

    const groupBehaviorFields = Object.entries(schema.properties).filter(
      ([_, value]) => value.group_behavior
    );

    const aggregatedTotalQuery =
      groupBySets.length > 0
        ? `
        SELECT 
         ${
           groupBehaviorFields.length > 0
             ? groupBehaviorFields
                 .map(
                   ([key, value]) =>
                     `${value.group_behavior}(${key}) AS total_${key}`
                 )
                 .join(", ")
                 .concat(", ")
             : ""
         } 
          COUNT(*) AS total_rows, SUM(subquery.groupCount) AS total_count
        FROM (
          SELECT
          ${
            groupBehaviorFields.length > 0
              ? groupBehaviorFields
                  .map(
                    ([key, value]) =>
                      `${value.group_behavior}(${key}) AS ${key}`
                  )
                  .join(", ")
                  .concat(", ")
              : ""
          } 
            COUNT(*) AS groupCount  
          FROM ${view} 
          ${combinedConditions}
          ${groupingClause}
        ) AS subquery`
        : `SELECT COUNT(*) AS total_rows FROM ${view} ${combinedConditions}`;

    return {
      query,
      aggregatedTotalQuery,
      searchValues,
      appliedFilters,
      appliedGroups,
    };
  }

  async getById(data) {
    const schema = data.entitySchemaCollection[data.params.entity];

    const result = await data.dbConnection.query(
      `SELECT * FROM ${schema.detail_view || schema.views} WHERE id = $1`,
      [data.params.id]
    );

    return result.rows[0];
  }

  async getAll(data) {
    const schema = data.entitySchemaCollection[data.params.entity];

    const result = await data.dbConnection.query(
      `SELECT * FROM ${schema.views}`
    );

    return result.rows;
  }

  async update(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    let insertObject = {
      keys: Object.keys(schema.properties),
      values: [],
    };

    if (data.body.password_hash) {
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    } else {
      insertObject.keys = insertObject.keys.filter(
        (key) => key !== "password_hash"
      );
    }
    if (this.hooks().update[data.params.entity]?.before) {
      await this.hooks().update[data.params.entity].before(data, insertObject);
    }

    insertObject.values = insertObject.keys.map((key) => data.body[key]);
    let query = `UPDATE ${schema.table} SET ${insertObject.keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(", ")}`;
    query += ` WHERE id = $${insertObject.keys.length + 1} RETURNING *`;

    const result = await data.dbConnection.query(query, [
      ...insertObject.values,
      data.params.id,
    ]);

    return result.rows[0];
  }

  async delete(data) {
    const schema = data.entitySchemaCollection[data.params.entity];
    // await this.deleteRelationships(data, schema, data.params.id);

    const result = await data.dbConnection.query(`UPDATE ${schema.table} SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [data.params.id]
    );

    // const result = await data.dbConnection.query(
    //   `DELETE FROM ${schema.table} WHERE id = $1 RETURNING *`,
    //   [data.params.id]
    // );

    return result.rows[0];
  }

  async deleteRelationships(data, schema, parentId) {
    if (!schema.relationships) return;

    for (const relationship of Object.values(schema.relationships)) {
      // If there are nested relationships, delete them first
      if (relationship.nested_relationships) {
        const nestedSchema = {
          relationships: relationship.nested_relationships,
        };

        // Query to get all the related entity ids for the nested relationships
        const relatedEntities = await data.dbConnection.query(
          `SELECT id FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
          [parentId]
        );

        // Recursively delete the nested relationships for each related entity
        for (const relatedEntity of relatedEntities.rows) {
          await this.deleteRelationships(data, nestedSchema, relatedEntity.id);
        }
      }

      // Delete the current relationship entries
      await data.dbConnection.query(
        `DELETE FROM ${relationship.table} WHERE ${relationship.foreign_key} = $1`,
        [parentId]
      );
    }
  }

  hooks() {
    async function roleUpdateHook(data, insertObject) {
      const currentPermissionsResult = await data.dbConnection.query(`
        SELECT role_permissions.permission_id, permissions.interface_id, permissions.name AS action, interfaces.name AS interface
        FROM role_permissions
        JOIN permissions ON role_permissions.permission_id = permissions.id
        JOIN interfaces ON permissions.interface_id = interfaces.id
        WHERE role_permissions.role_id = $1`,
        [data.params.id]
      );
      
      const currentPermissions = currentPermissionsResult.rows.map(row => ({
        permission_id: row.permission_id,
        interface_id: parseInt(row.interface_id, 10),
        action: row.action,
        interface: row.interface
      }));
    
      const newPermissions = data.body.permissions.filter(permission => permission.allowed);
      
      const addedPermissions = newPermissions.filter(
        (newPerm) =>
          !currentPermissions.some(
            (currPerm) =>
              currPerm.interface_id === newPerm.interface_id &&
              currPerm.action === newPerm.action
          )
      );

      const removedPermissions = currentPermissions.filter(
        (currPerm) =>
          !newPermissions.some(
            (newPerm) =>
              newPerm.interface_id === currPerm.interface_id &&
              newPerm.action === currPerm.action
          )
      );
      
      const addedPermissionNames = [];
      const removedPermissionNames = [];
    
      // Insert added permissions and retrieve interface and action names for logging
      for (const permission of addedPermissions) {
        const insertResult = await data.dbConnection.query(
          `WITH inserted_permission AS (
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            SELECT $1, p.id, NOW()
            FROM permissions p
            WHERE p.interface_id = $2 AND p.name = $3
            RETURNING permission_id
          )
          SELECT inserted_permission.permission_id, permissions.name AS action, interfaces.name AS interface
          FROM inserted_permission
          JOIN permissions ON inserted_permission.permission_id = permissions.id
          JOIN interfaces ON permissions.interface_id = interfaces.id`,
          [data.params.id, permission.interface_id, permission.action]
        );

        // Add to log list with interface name and action
        insertResult.rows.forEach(row => {
          addedPermissionNames.push(`${row.action} - ${row.interface}`);
        });
      }

      // Delete removed permissions and retrieve interface and action names for logging
      for (const permission of removedPermissions) {
        const deleteResult = await data.dbConnection.query(
          `WITH deleted_permission AS (
            DELETE FROM role_permissions
            WHERE role_id = $1 AND permission_id = (
              SELECT id FROM permissions
              WHERE interface_id = $2 AND name = $3
            )
            RETURNING permission_id
          )
          SELECT deleted_permission.permission_id, permissions.name AS action, interfaces.name AS interface
          FROM deleted_permission
          JOIN permissions ON deleted_permission.permission_id = permissions.id
          JOIN interfaces ON permissions.interface_id = interfaces.id`,
          [data.params.id, permission.interface_id, permission.action]
        );
           
        deleteResult.rows.forEach(row => {
          removedPermissionNames.push(`${row.action} - ${row.interface}`);
        });
      }
          
      await data.logger.info({
        code: STATUS_CODES.PERMISSION_CHANGE_SUCCESS,
        short_description: `Permissions updated for role with ID: ${data.params.id}`,
        long_description: `Added permissions: ${addedPermissionNames.join(', ')}; Removed permissions: ${removedPermissionNames.join(', ')}`
      });

      insertObject.keys = insertObject.keys.filter(
        (key) => key !== "role_permissions"
      );
    }

    async function adminUsersUpdateHook(data, insertObject) {
      const currentRolesResult = await data.dbConnection.query(`
        DELETE FROM admin_user_roles
        USING roles
        WHERE admin_user_roles.role_id = roles.id
          AND admin_user_roles.admin_user_id = $1
        RETURNING admin_user_roles.role_id, roles.name AS role_name`,
        [data.params.id]
      );
      const currentRoles = currentRolesResult.rows.map(row => ({
        role_id: row.role_id,
        role_name: row.role_name
      }));

      const newRoles = data.body.role_id;
      const addedRoles = newRoles.filter(roleId => !currentRoles.some(role => role.role_id === roleId));
      const removedRoles = currentRoles.filter(role => !newRoles.includes(role.role_id));

      for (const roleId of newRoles) {
        const result = await data.dbConnection.query(`
          INSERT INTO admin_user_roles (admin_user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
          RETURNING *`,
          [data.params.id, roleId]
        );
        console.log(result.rows);
      }

      const addedRolesResult = await data.dbConnection.query(`
        SELECT id AS role_id, name AS role_name
        FROM roles
        WHERE id = ANY($1)`,
        [addedRoles]
      );
      const addedRoleNames = addedRolesResult.rows.map(row => row.role_name);
      const removedRoleNames = removedRoles.map(role => role.role_name);

      insertObject.keys = insertObject.keys.filter((key) => key !== "role_id");
      
      await data.logger.info({
        code: STATUS_CODES.ROLE_CHANGE_SUCCESS,
        short_description: `User roles updated for user with ID: ${data.params.id}`,
        long_description: `Added roles: ${addedRoleNames.join(', ')}; Removed roles: ${removedRoleNames.join(', ')}`
      });
    }

    return {
      update: {
        roles: {
          before: roleUpdateHook,
        },
        "admin-users": {
          before: adminUsersUpdateHook,
        },
      },
    };
  }
}

module.exports = CrudService;
