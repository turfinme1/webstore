package com.webstore.backoffice.crud.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.ColumnDefault;

@Entity
@Table(name = "typeorm_metadata")
public class TypeormMetadatum {
    @Id
    @Size(max = 255)
    @NotNull
    @Column(name = "type", nullable = false)
    private String type;

    @Size(max = 255)
    @ColumnDefault("NULL")
    @Column(name = "database")
    private String database;

    @Size(max = 255)
    @ColumnDefault("NULL")
    @Column(name = "schema")
    private String schema;

    @Size(max = 255)
    @ColumnDefault("NULL")
    @Column(name = "\"table\"")
    private String table;

    @Size(max = 255)
    @ColumnDefault("NULL")
    @Column(name = "name")
    private String name;

    @Column(name = "value", length = Integer.MAX_VALUE)
    private String value;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String getSchema() {
        return schema;
    }

    public void setSchema(String schema) {
        this.schema = schema;
    }

    public String getTable() {
        return table;
    }

    public void setTable(String table) {
        this.table = table;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }

}