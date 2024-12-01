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
        }
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
        currency: (value) => {
            if(!value) {
                return '$0.00';
            }
            return `$${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(value)).replace(',', '.')}`;
        },
        date: (value) => {
            if(!value) {
                return '---';
            }
            return new Date(value).toLocaleDateString('en-US');
        },
        time: (value) => {
            if(!value) {
                return '---';
            }
            return new Date(value).toLocaleTimeString('en-US');
        },
        date_time: (value) => {
            if(!value) {
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
            if(!value) {
                return '---';
            }
            return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(value)).replace(',', '.').replace(".00", "")}`;
        },
        percentage: (value) => {
            if(!value) {
                return '---';
            }
            return `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2}).format(parseFloat(value)).replace(',', '.').replace(".00", "")}%`;
        }
    };

    buildFilterForm() {
        const formContainer = document.createElement('div');
        formContainer.className = 'bg-white p-4 rounded shadow-sm mb-5';
        
        const form = document.createElement('form');
        form.id = 'report-form';
        form.className = 'mb-3';

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

    render(containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        // Add title
        const title = document.createElement('h1');
        title.className = 'text-start mb-4';
        title.textContent = this.config.title;
        container.appendChild(title);

        // Add filter form
        container.appendChild(this.buildFilterForm());

        // Add table
        container.appendChild(this.buildTable());

        this.attachEventListeners();
    }

    attachEventListeners() {
        const form = document.getElementById('report-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const filters = Object.fromEntries(formData);
            await this.fetchData(filters);
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
            this.renderTableData(data);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            button.disabled = false;
            spinner.style.display = 'none';
        }
    }

    renderTableData(data) {
        const tbody = document.getElementById('report-table-body');
        if( data?.rows?.length <= 1) {
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
}

export { ReportBuilder };