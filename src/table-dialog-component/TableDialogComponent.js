import template from './template.js';

class TableDialogComponent extends HTMLElement {
  constructor() {
    super();

    const shadowDom = this.attachShadow({
      mode: 'closed'
    });
    shadowDom.innerHTML = template;

    this._dialogColumns = [];
    this._dialogFkColumns = [];
    this._dialogSchemaTable;

    this._dialogTableSameFkOptions = [];

    this._ready(shadowDom);
  }

  set types(types) {
    this._types = types;
  }

  _clear() {
    this._dialogColumns = [];
    this._dialogFkColumns = [];
    this._dialogColumnsElem.innerHTML = '';
    this._dialogFkColumnsElem.innerHTML = '';
    this._dialogNameInput.value = '';
    this._dialogErrorElem.innerHTML = '';
  }

  _ready(shadowdom) {
    this._dialog = shadowdom.querySelector('dialog');
    this._dialogTitleElem = shadowdom.querySelector('#dialog_title');
    this._dialogNameInput = shadowdom.querySelector('#name_input');
    this._dialogColumnsElem = shadowdom.querySelector('#columns');
    this._dialogFkColumnsElem = shadowdom.querySelector('#fk_columns');
    this._dialogCreateEditBtn = shadowdom.querySelector('#create_edit_button');
    this._dialogErrorElem = shadowdom.querySelector('.errors');
    this._dialogForm = shadowdom.querySelector('form');
    this._dialogCancelBtn = shadowdom.querySelector('#cancel');
    this._dialogAddColumnBtn = shadowdom.querySelector('#add_column');
    this._dialogAddRelationBtn = shadowdom.querySelector('#add_relation');

    this._setupEvents();
  }

  _dialogCreateEditBtnOnClick(event) {
    // TODO: validation

    if (!this._dialogForm.checkValidity()) {
      return;
    }

    let errorMessages = [];

    const formattedCollumns = this._dialogColumns.map((dialogColumn) => ({
      name: dialogColumn.columnNameInput.value,
      pk: dialogColumn.pkCheckbox.checked,
      uq: dialogColumn.uqCheckbox.checked,
      nn: dialogColumn.nnCheckbox.checked,
      type: dialogColumn.typeSelect.value
    }));

    const formattedFkCollumns = this._dialogFkColumns.map((dialogFkColumn) => ({
      name: dialogFkColumn.columnNameInput.value,
      pk: dialogFkColumn.pkCheckbox.checked,
      uq: dialogFkColumn.uqCheckbox.checked,
      nn: dialogFkColumn.nnCheckbox.checked,
      fk: {
        table: dialogFkColumn.foreignTableSelect.value,
        column: dialogFkColumn.foreignColumnSelect.value
      }
    }));

    const allColumns = formattedCollumns.concat(formattedFkCollumns);

    if (allColumns.find((columnI) => allColumns.find((columnJ) => columnI !== columnJ && columnI.name === columnJ.name))) {
      errorMessages.push(`Two or more columns with the same name.`);
    }

    this._schema.tables.forEach((table) => {
      for (const column of table.columns) {
        if (column.fk && column.fk.table === this._dialogSchemaTable.name) {
          if (!formattedCollumns.find((fColumn) => column.fk.column === fColumn.name)) {
            errorMessages.push(`Table ${table.name} has FK constraint to this table on column ${column.fk.column} that no longer exists.`);
            break;
          }
        }
      }
    });

    if (errorMessages.length > 0) {
      event.preventDefault();
      errorMessages.forEach((errorMessage) => {
        const errorElem = document.createElement('p');
        errorElem.innerHTML = errorMessage;
        this._dialogErrorElem.appendChild(errorElem);
      });
      return;
    }

    if (this._dialogSchemaTable.name !== this._dialogNameInput.value) {
      this._schema.tables.forEach((table) => {
        table.columns.forEach((column) => {
          if (column.fk && column.fk.table === this._dialogSchemaTable.name) {
            column.fk.table = this._dialogNameInput.value;
          }
        });
      });
      this._schema.name = this._dialogNameInput.value;
    }

    this._dialogSchemaTable.columns = formattedCollumns;

    this._dialogSchemaTable.columns = allColumns;
    this._dialogResolve(this._schema);
  }


  _setupEvents() {
    this._dialogCancelBtn.addEventListener('click', (event) => {
      this._dialog.close();
    });

    this._dialogCreateEditBtn.addEventListener('click', this._dialogCreateEditBtnOnClick.bind(this));

    this._dialogAddColumnBtn.addEventListener('click', (event) => {
      this._createColumnRow();
      event.preventDefault();
    });
    this._dialogAddRelationBtn.addEventListener('click', (event) => {
      this._createRelationRow(this._schema);
      event.preventDefault();
    });
  }

  _onForeignTableSelectChange(
    foreignTableSelect,
    foreignColumnSelect,
    dialogSchemaTable,
    currentEditableColumns) {
    if (dialogSchemaTable.name === foreignTableSelect.value) {
      currentEditableColumns.forEach((currentEditableColumn) => {
        currentEditableColumn.value;
        const tableColumnNameOption = document.createElement('option');
        tableColumnNameOption.setAttribute('value', currentEditableColumn.columnNameInput.value);
        tableColumnNameOption.innerHTML = currentEditableColumn.columnNameInput.value;
        foreignColumnSelect.appendChild(tableColumnNameOption);
        currentEditableColumn.columnNameInput.addEventListener('keyup', () => {
          tableColumnNameOption.setAttribute('value', currentEditableColumn.columnNameInput.value);
          tableColumnNameOption.innerHTML = currentEditableColumn.columnNameInput.value;
        });
      });
    } else {
      const columns = this._schema.tables.find((table) => table.name === foreignTableSelect.value).columns;
      foreignColumnSelect.innerHTML = '';
      columns.forEach((column) => {
        if (!column.fk && (column.uq || column.pk)) {
          const tableColumnNameOption = document.createElement('option');
          tableColumnNameOption.setAttribute('value', column.name);
          tableColumnNameOption.innerHTML = column.name;
          foreignColumnSelect.appendChild(tableColumnNameOption);
        }
      });
    }
  }

  _createCommonRow(column) {
    const tr = document.createElement('tr');

    const columnNameTd = document.createElement('td');
    const columnNameInput = document.createElement('input');
    columnNameTd.appendChild(columnNameInput);
    columnNameInput.required = true;
    tr.appendChild(columnNameTd);

    const pkTd = document.createElement('td');
    const pkCheckbox = document.createElement('input');
    pkCheckbox.setAttribute('type', 'checkbox');
    pkTd.appendChild(pkCheckbox);
    tr.appendChild(pkTd);

    const uqTd = document.createElement('td');
    const uqCheckbox = document.createElement('input');
    uqCheckbox.setAttribute('type', 'checkbox');
    uqTd.appendChild(uqCheckbox);
    tr.appendChild(uqTd);

    const nnTd = document.createElement('td');
    const nnCheckbox = document.createElement('input');
    nnCheckbox.setAttribute('type', 'checkbox');
    nnTd.appendChild(nnCheckbox);
    tr.appendChild(nnTd);

    const removeTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = 'Remove';
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);

    if (column) {
      columnNameInput.value = column.name;
      pkCheckbox.checked = column.pk;
      uqCheckbox.checked = column.uq;
      nnCheckbox.checked = column.nn;
    }

    return {tr, columnNameInput, pkCheckbox, uqCheckbox, nnCheckbox, removeBtn};
  }

  _createRelationRow(schema, column) {
    const result = this._createCommonRow(column);
    const foreignTableTd = document.createElement('td');
    const foreignTableSelect = document.createElement('select');
    schema.tables.forEach((table) => {
      const tableNameOption = document.createElement('option');
      tableNameOption.setAttribute('value', table.name);
      tableNameOption.innerHTML = table.name;
      foreignTableSelect.appendChild(tableNameOption);
      if (table.name === this._dialogSchemaTable.name) {
        this._dialogTableSameFkOptions.push(tableNameOption);
      }
    });
    if (column) {
      foreignTableSelect.value = column.fk.table;
    }
    foreignTableTd.appendChild(foreignTableSelect);
    result.tr.insertBefore(foreignTableTd, result.removeBtn.parentNode);

    const foreignColumnTd = document.createElement('td');
    const foreignColumnSelect = document.createElement('select');
    foreignColumnTd.appendChild(foreignColumnSelect);
    result.tr.insertBefore(foreignColumnTd, result.removeBtn.parentNode);

    this._dialogFkColumnsElem.appendChild(result.tr);

    const index = this._dialogFkColumns.push({
      columnNameInput: result.columnNameInput,
      pkCheckbox: result.pkCheckbox,
      uqCheckbox: result.uqCheckbox,
      nnCheckbox: result.nnCheckbox,
      foreignTableSelect,
      foreignColumnSelect
    }) - 1;

    result.removeBtn.addEventListener('click', () => {
      this._dialogFkColumns.splice(index, 1);
      result.tr.remove();
    });
  }

  _createColumnRow(column) {
    const result = this._createCommonRow(column);
    const typeTd = document.createElement('td');
    const typeSelect = document.createElement('select');

    this._types.forEach((type) => {
      const typeOption = document.createElement('option');
      typeOption.innerHTML = type;
      typeOption.setAttribute('value', type);
      typeSelect.appendChild(typeOption);
    });

    if (column) {
      typeSelect.value = column.type;
    }

    typeTd.appendChild(typeSelect);

    result.tr.insertBefore(typeTd, result.pkCheckbox.parentNode);

    this._dialogColumnsElem.appendChild(result.tr);

    const index = this._dialogColumns.push({
      columnNameInput: result.columnNameInput,
      pkCheckbox: result.pkCheckbox,
      uqCheckbox: result.uqCheckbox,
      nnCheckbox: result.nnCheckbox,
      typeSelect
    }) - 1;
    result.removeBtn.addEventListener('click', () => {
      this._dialogColumns.splice(index, 1);
      result.tr.remove();
    });
  }

  _openCreate() {
    this._dialogTitleElem.innerHTML = 'Create Table';
    this._dialogCreateEditBtn.innerHTML = 'Create';
    this._dialog.showModal();
    return Promise.resolve();
  }

  _openEdit(schema, table) {
    this._dialogTitleElem.innerHTML = 'Edit Table';
    this._dialogCreateEditBtn.innerHTML = 'Done';
    this._schema = schema;
    this._dialogSchemaTable = schema.tables.find((schemaTable) => schemaTable.name === table.name);

    this._dialogNameInput.value = this._dialogSchemaTable.name;
    this._dialogNameInput.addEventListener('keyup', () => {
      this._dialogTableSameFkOptions.forEach((option) => {
        option.setAttribute('value', this._dialogNameInput.value);
        option.innerHTML = this._dialogNameInput.value;
      });
    });
    this._dialogSchemaTable.columns.forEach((column) => {
      if (column.fk) {
        this._createRelationRow(schema, column);
      } else {
        this._createColumnRow(column);
      }
    });
    this._dialogFkColumns.forEach((item) => {
      this._onForeignTableSelectChange(item.foreignTableSelect,
        item.foreignColumnSelect,
        this._dialogSchemaTable,
        this._dialogColumns);
      item.foreignTableSelect.addEventListener('change', () => {
        this._onForeignTableSelectChange(item.foreignTableSelect,
          item.foreignColumnSelect,
          this._dialogSchemaTable,
          this._dialogColumns);
      });
    });
    this._dialog.showModal();
    return new Promise((resolve, reject) => {
      this._dialogResolve = resolve;
      this._dialogReject = reject;
    });
  }

  open(schema, table) {
    this._clear();
    if (!table) {
      return this._openCreate();
    }
    return this._openEdit(schema, table);
  }
}

customElements.define('table-dialog', TableDialogComponent);