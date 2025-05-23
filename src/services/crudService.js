const bcrypt = require("bcrypt");
const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");
const { hrtime } = require("process");

class CrudService {
  constructor(reportService) {
    this.reportService = reportService;
  }

  async create(data) {
    const schema = data.entitySchemaCollection[data.params.entity]; 

    // Hash the password if it exists
    if (data.body.password_hash) {
      data.body.password_hash = await bcrypt.hash(data.body.password_hash, 10);
    }

    if (data.body.dry_run === true && this.hooks().dry_run[data.params.entity]) {
      return await this.hooks().dry_run[data.params.entity](data);
    }

    if (this.hooks().create[data.params.entity]?.before) {
      await this.hooks().create[data.params.entity].before(data);
    }
    
    // Insert the main entity and return its ID
    const insertedEntity = await this.insertMainEntity(data, schema);

    // Handle insertions into mapping tables
    await this.handleMappingInsertions(data, schema, insertedEntity.id);

    if (this.hooks().create[data.params.entity]?.after) {
      await this.hooks().create[data.params.entity].after(data, insertedEntity);
    }

    return insertedEntity;
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
    return result.rows[0];
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
          // .map((_, index) => `STRPOS(LOWER(CAST(${filterField} AS text)), LOWER($${searchValues.length + index + 1})) > 0`)
          .map((_, index) => `LOWER(CAST(${filterField} AS text)) = LOWER($${searchValues.length + index + 1})`)
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
        } else if (schema.properties[filterField]?.format === "date-time-no-year") {
          searchValues.push(filterValue);
          conditions.push(
            `(EXTRACT(MONTH FROM ${filterField}), EXTRACT(DAY FROM ${filterField})) = 
            (EXTRACT(MONTH FROM $${searchValues.length}::date), EXTRACT(DAY FROM $${searchValues.length}::date))`
          );
        } else if (schema.properties[filterField]?.format === "date-range-overlap-start") {
          searchValues.push(filterValue);
          const endField = Object.keys(schema.properties).find(key => schema.properties[key]?.format === "date-range-overlap-end");
          conditions.push(
            `$${searchValues.length} <= ${endField}`
          );
        } else if (schema.properties[filterField]?.format === "date-range-overlap-end") {
          searchValues.push(filterValue);
          const startField = Object.keys(schema.properties).find(key => schema.properties[key]?.format === "date-range-overlap-start");
          conditions.push(
            `${startField} <= $${searchValues.length}`
          );
        } else if (typeof filterValue === "string") {
          searchValues.push(`${filterValue}`);
          conditions.push(
            `STRPOS(LOWER(CAST(${filterField} AS text)), LOWER($${searchValues.length})) > 0`
          ); 
        } else if (typeof filterValue === "object") {
          if (filterValue.min || filterValue.min == 0) {
            searchValues.push(filterValue.min);
            conditions.push(`${filterField} >= $${searchValues.length}`);
          }
          if (filterValue.max || filterValue.max == 0) {
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
        data.query?.orderParams?.length > 0
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

  async getAllEntities(data, context) {
    return Object.keys(context.entitySchemaCollection)
      .filter((property)=> context.entitySchemaCollection[property].table)
      .map((property)=> context.entitySchemaCollection[property]);
  }

  hooks() {
    return {
      create: {
        campaigns: {
          before: this.campainCreateHook,
        },
        "target-groups": {
          after: this.targetGroupCreateHook.bind(this),
        },
        "user-groups": {
          after: this.userGroupCreateHook.bind(this),
        },
        "notifications": {
          after: this.notificationCreateHook.bind(this),
        },
        "vouchers": {
          before: this.voucherCreateHook.bind(this),
        },
      },
      update: {
        roles: {
          before: this.roleUpdateHook,
        },
        "admin-users": {
          before: this.adminUsersUpdateHook,
        },
        "message-templates": {
          before: this.emailTemplateUpdateHook,
        },
        "user-groups": {
          before: this.userGroupUpdateHook.bind(this),
        },
      },
      dry_run: {
        "notifications": this.notificationDryRunHook.bind(this),
      },
    }
  };

  async campainCreateHook(data) {
    const currentDate = new Date();
    const start_date = new Date(data.body.start_date);
    const end_date = new Date(data.body.end_date);
    ASSERT_USER(start_date < end_date, "Start date must be before end date", { code: "SERVICE.CRUD.00444.INVALID_INPUT_CREATE_CAMPAIGN_DATE_RANGE", long_description: "Start date must be before end date" });
    ASSERT_USER(end_date > currentDate, "End date must be in the future", { code: "SERVICE.CRUD.00445.INVALID_INPUT_CREATE_CAMPAIGN_END_DATE", long_description: "End date must be in the future" });
    /// check if the voucher is active 
    const voucherResult = await data.dbConnection.query(`
      SELECT * FROM vouchers
      WHERE id = $1 AND is_active = TRUE`,
      [data.body.voucher_id]
    );
    const voucher = voucherResult.rows[0];
    ASSERT_USER(voucher, "Voucher is not active", { code: "SERVICE.CRUD.00453.INVALID_INPUT_CREATE_CAMPAIGN_VOUCHER_INVALID", long_description: "Voucher is not active" });
    let status = "Inactive";
    if(currentDate > voucher.end_date) {
      status = "Expired voucher";
    } else if (currentDate >= start_date && currentDate <= end_date) {
      status = "Active";
    } else if (currentDate < start_date) {
      status = "Pending";
    } 

    data.body.status = status;
  }

  async adminUsersUpdateHook(data, insertObject) {
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
      code: "SERVICE.CRUD.00507.ROLE_CHANGE_SUCCESS",
      short_description: `User roles updated for user with ID: ${data.params.id}`,
      long_description: `Added roles: ${addedRoleNames.join(', ')}; Removed roles: ${removedRoleNames.join(', ')}`
    });
  }

  async roleUpdateHook(data, insertObject) {
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
      code: "SERVICE.CRUD.00583.PERMISSION_CHANGE_SUCCESS",
      short_description: `Permissions updated for role with ID: ${data.params.id}`,
      long_description: `Added permissions: ${addedPermissionNames.join(', ')}; Removed permissions: ${removedPermissionNames.join(', ')}`
    });

    insertObject.keys = insertObject.keys.filter(
      (key) => key !== "role_permissions"
    );
  }

  async targetGroupCreateHook(data, mainEntity) {
    data.params.entity = "users";
    data.query = data.body.users.query;

    const innerInsertQuery = this.buildFilteredPaginatedQuery(data);

    const insertQuery = `
      INSERT INTO user_target_groups (user_id, target_group_id)
      SELECT users_view.id, $${innerInsertQuery.searchValues.length + 1}
      FROM (${innerInsertQuery.query}) AS users_view
      RETURNING *
    `;
  
    const queryValues = [...innerInsertQuery.searchValues, mainEntity.id];
  
    const result = await data.dbConnection.query(insertQuery, queryValues);
  }

  async userGroupCreateHook(data, mainEntity) {
    data.body.metadataRequest = true;
    data.params.report = 'report-users'
    const reportDefinition = await this.reportService.getReport(data)
    const replacedQueryData = await this.reportService.replaceFilterExpressions(data, reportDefinition.sql, reportDefinition.reportFilters, reportDefinition.reportUIConfig, data.body.filters, false);
    
    const insertQuery = `
      INSERT INTO user_user_groups (user_id, user_group_id)
      SELECT users_view.id, $${replacedQueryData.insertValues.length + 1}
      FROM (${replacedQueryData.sql}) AS users_view
      WHERE users_view.id IS NOT NULL`;

    const queryValues = [...replacedQueryData.insertValues, mainEntity.id];
    const result = await data.dbConnection.query(insertQuery, queryValues);
  }

  async userGroupUpdateHook(data, insertObject) {
    data.body.metadataRequest = true;
    data.params.report = 'report-users'
    const reportDefinition = await this.reportService.getReport(data)
    const replacedQueryData = await this.reportService.replaceFilterExpressions(data, reportDefinition.sql, reportDefinition.reportFilters, reportDefinition.reportUIConfig, data.body.filters, false);

    await data.dbConnection.query(`
      DELETE FROM user_user_groups
      WHERE user_group_id = $${replacedQueryData.insertValues.length + 1}
      AND user_id NOT IN (
        SELECT users_view.id 
        FROM (${replacedQueryData.sql}) AS users_view
        WHERE users_view.id IS NOT NULL
      )`,
      [...replacedQueryData.insertValues, data.params.id]
    );

    await data.dbConnection.query(`
      INSERT INTO user_user_groups (user_id, user_group_id)
      SELECT users_view.id, $${replacedQueryData.insertValues.length + 1}
      FROM (${replacedQueryData.sql}) AS users_view
      WHERE users_view.id IS NOT NULL
      ON CONFLICT (user_id, user_group_id) DO NOTHING`,
      [...replacedQueryData.insertValues, data.params.id]
    );

    await data.dbConnection.query(`
      UPDATE user_groups
      SET updated_at = NOW()
      WHERE id = $1`,
      [data.params.id]
    );
  }

  async emailTemplateUpdateHook(data, insertObject) {
    const currentEmailTemplateResult = await data.dbConnection.query(`
      SELECT * FROM message_templates
      WHERE id = $1`,
      [data.params.id]
    );
    ASSERT_USER(currentEmailTemplateResult.rows.length > 0, "Email template not found", { code: "SERVICE.CRUD.00620.INVALID_INPUT_UPDATE_TEMPLATE_NOT_FOUND", long_description: "Email template not found" });
    const currentEmailTemplate = currentEmailTemplateResult.rows[0];
    data.body.placeholders = JSON.stringify(currentEmailTemplate.placeholders);
  }

  async notificationCreateHook(data, mainEntity) {
    const start = hrtime();

    const templateResult = await data.dbConnection.query(
        `SELECT * FROM message_templates WHERE id = $1`,
        [mainEntity.template_id]
    );
    ASSERT_USER(templateResult.rows.length > 0, "Template not found", {
        code: "SERVICE.CRUD.00630.TEMPLATE_NOT_FOUND",
        long_description: "Notification template not found"
    });
    
    const template = templateResult.rows[0];
    
    if (template.type === 'Push-Notification-Broadcast') {
        await data.dbConnection.query(`
          INSERT INTO message_queue (recipient_id, push_subscription_id, subject, text_content, notification_id, type)
          SELECT user_id, id, $1, $2, $3, $4
          FROM push_subscriptions
          WHERE status = 'active'`,
          [template.subject, template.template, mainEntity.id, template.type]
        );

        const endBroadcast = hrtime(start);
        const elapsedTimeBroadcast = (endBroadcast[0] * 1e9 + endBroadcast[1]) / 1e6; // Convert to milliseconds
        console.log(`Email queue process completed in ${elapsedTimeBroadcast} ms`);
        return;
    }

    const userIds = mainEntity.user_ids.split(',').map(id => parseInt(id.trim()));
    let usersResult;

    if(template.type === 'Notification') {
      usersResult = await data.dbConnection.query(`
        SELECT DISTINCT id, email, first_name, last_name, phone 
        FROM users
        WHERE id = ANY($1)`,
        [userIds]
      );
    } else {
      usersResult = await data.dbConnection.query(`
        SELECT DISTINCT users.id, email, first_name, last_name, phone 
        FROM users
        JOIN push_subscriptions ON users.id = push_subscriptions.user_id
        WHERE push_subscriptions.status = 'active' AND users.id = ANY($1)`,
        [userIds]
      );
    }
    ASSERT_USER(usersResult.rows.length > 0, "No users found", { code: "SERVICE.EMAIL.00114.INVALID_USERS", long_description: "No users found" });

    // Create message for each user
    for (const user of usersResult.rows) {
        let text_content = template.template;
        for (const placeholder of template.placeholders) {
          let placeholderKey = placeholder.replace(/[{}]/g, "");
          ASSERT(user[placeholderKey] !== null, "Missing email template placeholder", { code: "SERVICE.EMAIL.00115.INVALID_INPUT_TEMPLATE", long_description: `"Missing email template placeholder: ${placeholderKey}` });
          text_content = text_content.replaceAll(`${placeholder}`, user[placeholderKey]);
        }
        
        await data.dbConnection.query(
          `INSERT INTO message_queue (recipient_id, recipient_email, subject, text_content, notification_id, type, event_type) 
          VALUES ($1, $2, $3, $4, $5, $6, 'notification')`,
          [user.id, user.email, template.subject, text_content, mainEntity.id, template.type]
        );
    }

    const end = hrtime(start);
    const elapsedTime = (end[0] * 1e9 + end[1]) / 1e6; // Convert to milliseconds
    console.log(`Email queue process completed in ${elapsedTime} ms`);
  }

  async notificationDryRunHook(data) {
    const templateResult = await data.dbConnection.query(
      `SELECT * FROM message_templates WHERE id = $1`,
      [data.body.template_id]
    );
    ASSERT_USER(templateResult.rows.length > 0, "Template not found", {
        code: "SERVICE.CRUD.00630.TEMPLATE_NOT_FOUND",
        long_description: "Notification template not found"
    });

    const template = templateResult.rows[0];

    if (template.type === 'Push-Notification-Broadcast') {
      const countResult = await data.dbConnection.query(`
        SELECT COUNT(*) FROM push_subscriptions WHERE status = 'active'`,
      );
      return { message: `This will affect ${countResult.rows[0].count} users. Proceed?` }
    } else if (template.type === 'Push-Notification') {
      const userIds = data.body.user_ids.split(',').map(id => parseInt(id.trim()));
      const countResult = await data.dbConnection.query(`
        SELECT COUNT(DISTINCT user_id) FROM push_subscriptions WHERE user_id = ANY($1) AND status = 'active'`,
        [userIds]
      );
      return { message: `This will affect ${countResult.rows[0].count} users. Proceed?` }
    } else {
      const userIds = data.body.user_ids.split(',').map(id => parseInt(id.trim()));
      const countResult = await data.dbConnection.query(`
        SELECT COUNT(DISTINCT id) FROM users WHERE id = ANY($1)`,
        [userIds]
      );
      return { message: `This will affect ${countResult.rows[0].count} users. Proceed?` }
    }
  }

  async voucherCreateHook(data) {
    const currentDate = new Date();
    const start_date = new Date(data.body.start_date);
    const end_date = new Date(data.body.end_date);
    ASSERT_USER(start_date < end_date, "Start date must be before end date", { code: "SERVICE.CRUD.00444.INVALID_INPUT_CREATE_VOUCHER_DATE_RANGE", long_description: "Start date must be before end date" });
    ASSERT_USER(end_date > currentDate, "End date must be in the future", { code: "SERVICE.CRUD.00445.INVALID_INPUT_CREATE_VOUCHER_END_DATE", long_description: "End date must be in the future" });
  }
}

module.exports = CrudService;
