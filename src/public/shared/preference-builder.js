import * as pageUtility from "./page-utility.js";

export class PreferenceBuilder {
  constructor(reportKey, config) {
    this.reportKey = reportKey;
    this.config = config;
    this.columns = config.headerGroups.flat().map(col => ({
      key: col.key,
      label: col.label,
      hideInUI: false
    }));
  }

  async render(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    const title = document.createElement('h1');
    title.textContent = `Customize Columns for ${this.config.title}`;
    container.appendChild(title);

    this.formEl = document.createElement('form');
    this.formEl.id = 'prefs-form';
    this.formEl.classList.add('mb-4');
    container.appendChild(this.formEl);

    const btnContainer = document.createElement('div');

    const saveBtn = document.createElement('button');
    saveBtn.id = 'btn-save';
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-primary me-2';
    saveBtn.textContent = 'Save';
    btnContainer.appendChild(saveBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'btn-cancel';
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    btnContainer.appendChild(cancelBtn);

    container.appendChild(btnContainer);

    await this.load();

    document.getElementById("btn-save").addEventListener("click", e => {
      e.preventDefault();
      this.save();
    });
    document.getElementById("btn-cancel").addEventListener("click", e => {
      e.preventDefault();
      window.location.href = `/report?report=${this.reportKey}`;
    });
  }

  renderCheckboxes() {
    this.formEl.innerHTML = '';

    for (const col of this.columns) {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check mb-2';

      const chk = document.createElement('input');
      chk.className = 'form-check-input';
      chk.type = 'checkbox';
      chk.id = `chk-${col.key}`;
      chk.dataset.key = col.key;
      chk.checked = !col.hideInUI;

      const label = document.createElement('label');
      label.className = 'form-check-label';
      label.htmlFor = chk.id;
      label.textContent = col.label;

      wrapper.appendChild(chk);
      wrapper.appendChild(label);
      this.formEl.appendChild(wrapper);
    }
  }

  async load() {
    try {
      const res = await pageUtility.fetchWithErrorHandling(
        `/api/reports/${this.reportKey}/preferences`
      );
      const prefCols = res.data.rows[0]?.preference?.headerGroups || [];
      for (const col of this.columns) {
        const saved = prefCols.find(p => p.key === col.key);
        if (saved && typeof saved.hideInUI === "boolean") {
          col.hideInUI = saved.hideInUI;
        }
      }
      this.renderCheckboxes();
    } catch (err) {
      console.error(err);
      pageUtility.showErrorMessage("Could not load preferences");
    }
  }

  async save() {
    const updated = this.columns.map(col => {
      const checked = !!document
        .getElementById(`chk-${col.key}`)
        .checked;
      return {
        key: col.key,
        label: col.label,
        hideInUI: !checked
      };
    });
    const payload = { headerGroups: updated };

    try {
      await pageUtility.fetchWithErrorHandling(
        `/api/reports/${this.reportKey}/preferences`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );
      window.location.href = `/report?report=${this.reportKey}`;
    } catch (err) {
      console.error(err);
      pageUtility.showErrorMessage("Failed to save preferences");
    }
  }
}
