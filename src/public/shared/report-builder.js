import { showToastMessage } from "./page-utility.js";

class ReportBuilder {
    constructor(config) {
        this.config = config;
        this.elements = {};
        this.state = {
            filters: {},
            tableData: null
        };
    }

    static filterTypes = {
        text: {
            template: (filter) => `
                <div class="mb-3">
                    <label for="${filter.key}" class="form-label">${filter.label}</label>
                    <input type="text" 
                           id="${filter.key}" 
                           name="${filter.key}" 
                           class="form-control" 
                           placeholder="${filter.placeholder || ''}"
                           ${filter.required ? 'required' : ''}>
                </div>
            `
        },
        number: {
            template: (filter) => `
                <div class="row g-3">
                    <div class="mb-3 col-auto">
                        <label for="${filter.key}_minimum" class="form-label">${filter.label} Min</label>
                        <input type="number" 
                               id="${filter.key}_minimum" 
                               name="${filter.key}_minimum" 
                               class="form-control" 
                               step="${filter.step || '1'}"
                               min="${filter.min || '0'}"
                               max="${filter.max || ''}"
                               placeholder="Min">
                    </div>
                    <div class="mb-3 col-auto">
                        <label for="${filter.key}_maximum" class="form-label">${filter.label} Max</label>
                        <input type="number" 
                               id="${filter.key}_maximum"   
                               name="${filter.key}_maximum" 
                               class="form-control" 
                               step="${filter.step || '1'}"
                               min="${filter.min || '0'}"
                               max="${filter.max || ''}"
                               placeholder="Max">
                    </div>
                </div>
            `
        },
        number_single: {
            template: (filter) => `
                <div class="mb-3">
                    <label for="${filter.key}" class="form-label">${filter.label}</label>
                    <input type="number"
                            id="${filter.key}"
                            name="${filter.key}"
                            class="form-control"
                            step="${filter.step || '1'}"
                            min="${filter.min || '0'}"
                            max="${filter.max || ''}"
                            placeholder="${filter.placeholder || ''}"
                            ${filter.required ? 'required' : ''}>
                </div>
            `
        },
        timestamp: {
            template: (filter) => `
                <div class="row g-3">
                    <div class="mb-3 col-auto">
                        <label for="${filter.key}_minimum" class="form-label">${filter.label} Start</label>
                        <input type="datetime-local" step="1" 
                               id="${filter.key}_minimum"
                               value="${new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().slice(0, 16)}"
                               name="${filter.key}_minimum" 
                               class="form-control">
                    </div>
                    <div class="mb-3 col-auto">
                        <label for="${filter.key}_maximum" class="form-label">${filter.label} End</label>
                        <input type="datetime-local" step="1" 
                               id="${filter.key}_maximum"
                               value="${new Date().toISOString().slice(0, 16)}" 
                               name="${filter.key}_maximum" 
                               class="form-control">
                    </div>
                </div>
            `
        },
        select: {
            template: (filter) => `
                <div class="mb-3">
                    <label for="${filter.key}" class="form-label">${filter.label}</label>
                    <select id="${filter.key}"
                            name="${filter.key}"
                            class="form-select"
                            ${filter.required ? 'required' : ''}>
                        <option value="">Select ${filter.label}</option>
                        ${filter.options.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
                    </select>
                </div>
            `
        },
    };

    static groupTypes = {
        select: {
            template: (filter) => `
                <div class="mb-3">
                    <label for="${filter.key}_grouping_select_value" class="form-label">${filter.label}</label>
                    <select 
                            id="${filter.key}_grouping_select_value"
                            name="${filter.key}_grouping_select_value"
                            class="form-select"
                            ${filter.required ? 'required' : ''}
                    >
                        <option value="">No grouping</option>
                        <option value="group">Group by ${filter.label}</option>
                    </select>
                </div>
            `
        },
        timestamp: {
            template: (filter) => `
                <div class="mb-3">
                    <label for="${filter.key}_grouping_select_value" class="form-label">${filter.label}</label>
                    <select 
                            id="${filter.key}_grouping_select_value"
                            name="${filter.key}_grouping_select_value"
                            class="form-select"
                            ${filter.required ? 'required' : ''}
                    >
                        <option value="">No grouping</option>
                        <option value="hour">Group by Hour</option>
                        <option value="day">Group by Day</option>
                        <option value="week">Group by Week</option>
                        <option value="month">Group by Month</option>
                        <option value="year">Group by Year</option>
                    </select>
                </div>
            `
        },
        text: {
            template: (filter) => `
                <div class="mb-3">
                    <label for="${filter.key}_grouping_select_value" class="form-label">${filter.label}</label>
                    <select 
                            id="${filter.key}_grouping_select_value"
                            name="${filter.key}_grouping_select_value"
                            class="form-select"
                            ${filter.required ? 'required' : ''}
                    >
                        <option value="">No grouping</option>
                        <option value="group">Group by ${filter.label}</option>
                    </select>
                </div>
            `
        },
    }

    static tableTemplates = {
        default: {
            header: (columns) => `
                <thead class="table-dark">
                    <tr>
                        ${columns.map(col => `<th>${col.label}</th>`).join('')}
                    </tr>
                </thead>
            `,
            row: (rowData, columns) => `
                <tr>
                    ${columns.map(col => `
                        <td style="text-align: ${col.align || 'left'};">
                             ${index === 0 && !rowData[col.key] 
                                ? "Total:"
                                : col.format 
                                    ? this.formatters[col.format](rowData[col.key])
                                    : rowData[col.key] || "---"
                            }
                        </td>
                    `).join('')}
                </tr>
            `
        },
        groupedHeaders: {
            header: (headerGroups) => `
                <thead class="table-dark">
                    ${headerGroups.map(group => `
                        <tr>
                            ${group.map(header => `
                                <th colspan="${header.colspan || 1}" 
                                    rowspan="${header.rowspan || 1}">
                                    ${header.label}
                                </th>
                            `).join('')}
                        </tr>
                    `).join('')}
                </thead>
            `,
            row: (rowData, columns) => `
                <tr>
                    ${columns.map((col, index) => `
                        <td style="text-align: ${col.align || 'left'};">
                            ${index === 0 && !rowData[col.key] 
                                ? "Total:"
                                : col.format 
                                    ? this.formatters[col.format](rowData[col.key])
                                    : rowData[col.key] || "---"
                            }
                        </td>
                    `).join('')}
                </tr>
            `
        }
    };

    static formatters = {
        text: (value) => {
            if(!value || value ==="All") {
                return '---';
            }
            return value;
        },
        currency: (value) => {
            if(!value || value ==="All") {
                return '---';
            }
            return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(value)).replace(',', '.')}`;
        },
        date: (value) => {
            if(!value || value ==="All") {
                return '---';
            }
            return new Date(value).toLocaleDateString('en-US');
        },
        time: (value) => {
            if(!value || value ==="All") {
                return '---';
            }
            return new Date(value).toLocaleTimeString('en-US');
        },
        date_time: (value) => {
            if(!value || value ==="All") {
                return '---';
            }
            return new Date(value).toLocaleString('en-US', {
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })
        },
        number: (value) => {
            if(value == 0) {
                return '0';
            }
            if(!value || value ==="All") {
                return '---';
            }
            return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(value)).replace(',', '.').replace(".00", "")}`;
        },
        percentage: (value) => {
            if(!value || value ==="All") {
                return '---';
            }
            return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(value)).replace(',', '.').replace(".00", "")}%`;
        }
    };

    async buildFilterForm() {
        const formContainer = document.createElement('div');
        formContainer.className = 'bg-white p-4 rounded shadow-sm mb-5';
        
        const form = document.createElement('form');
        form.id = 'report-form';
        form.className = 'mb-3';

        for (const filter of this.config.filters) {
            if (filter.type === 'select' && !filter.options) {
                filter.options = await this.fetchOptions(filter);
            }
        }

        const filterHTML = this.config.filters.map(filter => {
            const filterType = ReportBuilder.filterTypes[filter.type];
            return filterType.template(filter);
        }).join('');

        const groupHTML = this.config.filters.filter(filter=> filter?.groupable).map(filter => {
            const filterType = ReportBuilder.groupTypes[filter.type];
            return filterType.template(filter);
        }).join('');

        form.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    ${filterHTML}
                </div>
                <div class="col-md-6">
                    ${groupHTML}
                </div>
            </div>
            <div class="d-flex justify-content-start align-items-center mb-3">
                <button type="submit" class="btn btn-primary">Apply Filters</button>
                <div id="spinner" class="spinner-border text-primary ms-3" role="status" style="display: none;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        formContainer.appendChild(form);
        return formContainer;
    }

    buildTable() {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive bg-white p-3 rounded shadow-sm';

        const totalRowCountDiv = document.createElement('div');
        totalRowCountDiv.id = 'total-row-count';
        totalRowCountDiv.className = 'text-end mb-3';
        totalRowCountDiv.textContent = 'Total rows: 0';
        tableContainer.appendChild(totalRowCountDiv);
        
        const table = document.createElement('table');
        table.className = 'table table-bordered table-striped table-hover';
        const template = ReportBuilder.tableTemplates[this.config.tableTemplate || 'default'];
        table.innerHTML = `
            ${template.header(this.config.headerGroups)}
            <tbody id="report-table-body"></tbody>
        `;
        tableContainer.appendChild(table);

        return tableContainer;
    }

    async render(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        // Add title
        const title = document.createElement('h1');
        title.className = 'text-start mb-4';
        title.textContent = this.config.title;
        container.appendChild(title);

        // Add export section
        container.appendChild(this.buildExportSection(this.config.exportConfig));

        // Add filter form
        container.appendChild(await this.buildFilterForm());

        // Add table
        container.appendChild(this.buildTable());

        this.attachEventListeners();
    }

    attachEventListeners() {
        const form = document.getElementById('report-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if(await this.validateForm()) {
                const formData = new FormData(form);
                const filters = Object.fromEntries(formData);
                await this.fetchData(filters);
            }
        });
    }

    async fetchData(filters) {
        const spinner = document.getElementById('spinner');
        const button = document.querySelector('button[type="submit"]');
        button.disabled = true;
        spinner.style.display = 'block';

        try {
            const response = await fetch(this.config.dataEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });
            
            const data = await response.json();
            if(data.overRowDisplayLimit){
                showToastMessage("The row limit has been reached. Please refine your search criteria.", "error");
            }
            this.renderTableData(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            if (!navigator.onLine) {
                showToastMessage('No internet connection', 'error');
            } else {
                showToastMessage('Error fetching data', 'error');
            }
        } finally {
            button.disabled = false;
            spinner.style.display = 'none';
        }
    }

    async fetchOptions(filter) {
        const response = await fetch(filter.fetchFrom);
        let options = await response.json();
        options = options.map(option => ({ value: option[filter.valueKey], label: option[filter.displayKey] }));
        return options;
    };

    renderTableData(data) {
        const tbody = document.getElementById('report-table-body');
        const totalRowCountDiv = document.getElementById('total-row-count');
        totalRowCountDiv.textContent = `Total rows: ${data?.rows?.length > 1 ? data.rows.length - 1 : 0}`;

        if (data?.rows?.length <= 1) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${this.config.columns.length}" class="text-center">
                        No data available
                    </td>
                </tr>
            `;
            return;
        }
        tbody.innerHTML = data.rows.map(row => 
            ReportBuilder.tableTemplates[this.config.tableTemplate || 'default']
                .row(row, this.config.columns)
        ).join('');
    }

    buildExportSection(exportConfig) {
        const exportContainer = document.createElement('div');
        // exportContainer.className = 'mt-5';
        exportContainer.className = 'mb-3';

        if(exportConfig?.csv) {
            const exportButton = document.createElement('button');
            exportButton.className = 'btn btn-primary export';
            exportButton.textContent = 'Export to CSV';
            exportButton.addEventListener('click', async () => this.handleExport(exportConfig.csv.endpoint));
            exportContainer.appendChild(exportButton);
        }

        if(exportConfig?.excel) {
            const exportButton = document.createElement('button');
            exportButton.className = 'btn btn-primary ms-3 export';
            exportButton.textContent = 'Export to Excel';
            exportButton.addEventListener('click', async () => this.handleExport(exportConfig.excel.endpoint));
            exportContainer.appendChild(exportButton);
        }

        return exportContainer;
    }

    async handleExport(endpoint){
        const spinner = document.getElementById('spinner');
        spinner.style.display = 'block';
        const exportButtons = document.querySelectorAll('.export');
        const button = document.querySelector('button[type="submit"]');
        button.disabled = true;
        exportButtons.forEach(button => button.disabled = true);
        try {
            const formData = new FormData(document.getElementById('report-form'));
            const filters = Object.fromEntries(formData);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filters)
            });

            if(! response.ok){
                throw new Error('Export failed');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'export.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            if (!navigator.onLine) {
                showToastMessage('No internet connection', 'error');
            } else {
                showToastMessage('Export failed.', 'error');
            }
        } finally {
            button.disabled = false;
            exportButtons.forEach(button => button.disabled = false);
            spinner.style.display = 'none';
        }
    }

    async validateForm() {
        let isValid = true;
        const errors = [];

        this.clearValidationErrors();

        for (const filter of this.config.filters) {
            if (filter.type === 'number' || filter.type === 'timestamp') {
                const minInput = document.getElementById(`${filter.key}_minimum`);
                const maxInput = document.getElementById(`${filter.key}_maximum`);
                
                if (minInput && maxInput) {
                    const validationResults = ValidationService.validateField(
                        filter, 
                        minInput.value, 
                        maxInput.value
                    );

                    if (validationResults.length > 0) {
                        isValid = false;
                        validationResults.forEach(result => {
                            this.showValidationError(filter.key, result.message, result.field);
                            errors.push(result.message);
                        });
                    }
                }
            } else if (filter.type === 'select' && filter.required) {
                const input = document.getElementById(filter.key);
                if (input) {
                    const validationResults = ValidationService.validateField(
                        filter,
                        input.value,
                        filter.options
                    );

                    if (validationResults.length > 0) {
                        isValid = false;
                        validationResults.forEach(result => {
                            this.showValidationError(filter.key, result.message, result.field);
                            errors.push(result.message);
                        });
                    }
                }
            } else if (filter.type === 'text') {
                const input = document.getElementById(filter.key);
                if (input) {
                    const validationResults = ValidationService.validateField(
                        filter,
                        input.value
                    );

                    if (validationResults.length > 0) {
                        isValid = false;
                        validationResults.forEach(result => {
                            this.showValidationError(filter.key, result.message, result.field || 'input');
                            errors.push(result.message);
                        });
                    }
                }
            }
        }

        if (!isValid) {
            showToastMessage('Please correct the validation errors', 'error');
        }

        return isValid;
    }

    showValidationError(filterKey, message, field = 'input') {
        let errorContainer = document.getElementById(`${filterKey}-error-${field}`);

        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'invalid-feedback d-block';
            errorContainer.id = `${filterKey}-error-${field}`;
            let inputElement;

            if (field === 'min') {
                inputElement = document.getElementById(`${filterKey}_minimum`);
            } else if (field === 'max') {
                inputElement = document.getElementById(`${filterKey}_maximum`);
            } else {
                inputElement = document.getElementById(filterKey);
            }

            if (inputElement) {
                inputElement.classList.add('is-invalid');
                inputElement.parentElement.appendChild(errorContainer);
            }
        }

        if (!errorContainer.textContent.includes(message)) {
            const messageElement = document.createElement('div');
            messageElement.textContent = message;
            errorContainer.appendChild(messageElement);
        }
    }

    clearValidationErrors() {
        document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }
}

export { ReportBuilder };

class ValidationService {
    static rules = {
        timestamp: [
            {
                validate: (min, max) => {
                    if (!min || !max) {
                        return { isValid: true };
                    }
                    return {
                        isValid: new Date(min) <= new Date(max),
                        field: 'min',
                        message: 'Start date must be before end date',
                    };
                },
            },
            {
                validate: (min, max) => {
                    const errors = [];
                    const now = new Date();
                    if (min && new Date(min) > now) {
                        errors.push({
                            isValid: false,
                            field: 'min',
                            message: 'Start date must be in the past',
                        });
                    }
                    if (max && new Date(max) > now) {
                        errors.push({
                            isValid: false,
                            field: 'max',
                            message: 'End date must be in the past',
                        });
                    }
                    if (errors.length > 0) {
                        return errors;
                    }
                    return { isValid: true };
                },
            },
        ],
        number: [
            {
                validate: (min, max) => {
                    if (!min || !max) {
                        return { isValid: true };
                    }
                    return {
                        isValid: parseFloat(min) <= parseFloat(max),
                        field: 'min',
                        message: 'Minimum value must be less than maximum value',
                    };
                },
            },
        ],
        text: [    
            {
                validate: (value) => {
                    if (!value) {
                        return { isValid: true };
                    }
                    const isValid = value.length <= 255;
                    return {
                        isValid,
                        field: 'input',
                        message: 'Text must not exceed 255 characters',
                    };
                },
            },
        ]
    }

    static validateField(filter, value, maxValue) {
        const rules = this.rules[filter.type] || [];
        let errors = [];

        for (const rule of rules) {
            const result = rule.validate(value, maxValue);
            if (Array.isArray(result) && result.length > 0) {
                errors = errors.concat(result);
            } else if (!result.isValid) {
                errors.push(result);
            }
        }

        if (errors.length > 0) {
            return errors;
        }

        return [];
    }
}