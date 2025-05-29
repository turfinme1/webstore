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

    const list = document.createElement('ul');
    list.id = 'column-list';
    list.className = 'list-group mb-4';
    this.formEl.appendChild(list);

    for (const col of this.columns) {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center';
      li.dataset.key = col.key;

      // drag handle
      const handle = document.createElement('span');
      handle.className = 'me-3 drag-handle';
      handle.style.cursor = 'grab';
      handle.innerHTML = '&#9776;'; // ☰
      li.appendChild(handle);

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'form-check-input me-2';
      chk.id = `chk-${col.key}`;
      chk.checked = !col.hideInUI;
      li.appendChild(chk);

      const label = document.createElement('label');
      label.htmlFor = chk.id;
      label.className = 'form-check-label';
      label.textContent = col.label;
      li.appendChild(label);

      list.appendChild(li);
    }

    // wire up Sortable on our list
    this.sortable = Sortable.create(list, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: (evt) => {
        // update this.columns to reflect new order
        const movedItem = this.columns.splice(evt.oldIndex, 1)[0];
        this.columns.splice(evt.newIndex, 0, movedItem);
      }
    });
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

      const orderMap = new Map(
        prefCols.map((p, index) => [p.key, index])
      );

      this.columns.sort((a, b) => {
        const ia = orderMap.has(a.key) ? orderMap.get(a.key) : Number.MAX_SAFE_INTEGER;
        const ib = orderMap.has(b.key) ? orderMap.get(b.key) : Number.MAX_SAFE_INTEGER;
        return ia - ib;
     });

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
