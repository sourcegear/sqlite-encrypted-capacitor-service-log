(function (root) {
  'use strict';

  var api = root.CapacitorVisitDatabase;
  var records = [];
  var selectedId = null;
  var started = false;

  function element(id) {
    return document.getElementById(id);
  }

  function setActivationStatus(text, kind) {
    var status = element('activation-state');
    status.textContent = text;
    status.className = 'status ' + kind;
  }

  function showStartupError(error) {
    var output = element('startup-error');
    output.textContent = api.errorMessage(error);
    output.hidden = false;
  }

  function formatDate(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function render() {
    var list = element('visit-list');
    list.replaceChildren();
    element('visit-count').textContent = String(records.length);
    if (records.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'empty muted';
      empty.textContent = 'No visits found.';
      list.appendChild(empty);
      return;
    }

    records.forEach(function (record) {
      var button = document.createElement('button');
      button.className = 'visit-row' + (record.id === selectedId ? ' selected' : '');
      button.type = 'button';
      var customer = document.createElement('strong');
      customer.textContent = record.customer;
      var location = document.createElement('span');
      location.textContent = record.location;
      var date = document.createElement('small');
      date.textContent = formatDate(record.visited_at);
      button.append(customer, location, date);
      button.addEventListener('click', function () { select(record.id); });
      list.appendChild(button);
    });
  }

  async function reload(selectId) {
    records = await api.list(element('search').value);
    selectedId = typeof selectId === 'number' ? selectId : selectedId;
    render();
  }

  function select(id) {
    var record = records.find(function (item) { return item.id === id; });
    if (!record) {
      return;
    }
    selectedId = id;
    element('editor-heading').textContent = 'Edit visit';
    element('customer').value = record.customer;
    element('location').value = record.location;
    element('notes').value = record.notes;
    element('delete-button').hidden = false;
    element('editor-status').textContent = 'Visited ' + formatDate(record.visited_at);
    render();
  }

  function resetEditor() {
    selectedId = null;
    element('editor-heading').textContent = 'New visit';
    element('customer').value = '';
    element('location').value = '';
    element('notes').value = '';
    element('delete-button').hidden = true;
    element('editor-status').textContent = 'Ready';
    render();
  }

  async function openLog() {
    element('startup-error').hidden = true;
    var button = element('open-button');
    button.disabled = true;
    try {
      await api.open(element('database-key').value);
      element('database-key').value = '';
      element('startup-card').hidden = true;
      element('workspace').hidden = false;
      await reload();
      resetEditor();
    } catch (error) {
      showStartupError(error);
      button.disabled = false;
    }
  }

  async function saveVisit() {
    var customer = element('customer').value.trim();
    var location = element('location').value.trim();
    var notes = element('notes').value.trim();
    if (!customer || !location) {
      element('editor-status').textContent = 'Customer and location are required.';
      return;
    }
    try {
      if (selectedId === null) {
        selectedId = await api.add(customer, location, notes);
        element('editor-status').textContent = 'Visit added.';
      } else {
        await api.update(selectedId, customer, location, notes);
        element('editor-status').textContent = 'Visit updated.';
      }
      await reload(selectedId);
    } catch (error) {
      element('editor-status').textContent = 'Save failed: ' + api.errorMessage(error);
    }
  }

  async function deleteVisit() {
    if (selectedId === null) {
      return;
    }
    try {
      await api.remove(selectedId);
      await reload();
      resetEditor();
      element('editor-status').textContent = 'Visit deleted.';
    } catch (error) {
      element('editor-status').textContent = 'Delete failed: ' + api.errorMessage(error);
    }
  }

  async function start() {
    if (started) {
      return;
    }
    started = true;
    try {
      await api.activateAndValidate(root.SQLiteEncryptedConfig.activationKey);
      setActivationStatus('SQLite.Encrypted is ready', 'ready');
      element('open-button').disabled = false;
    } catch (error) {
      setActivationStatus('SQLite.Encrypted could not start', 'failed');
      showStartupError(error);
    }
  }

  element('open-button').addEventListener('click', openLog);
  element('new-button').addEventListener('click', resetEditor);
  element('save-button').addEventListener('click', saveVisit);
  element('delete-button').addEventListener('click', deleteVisit);
  element('search').addEventListener('input', function () {
    reload().catch(function (error) {
      element('editor-status').textContent = 'Search failed: ' + api.errorMessage(error);
    });
  });
  document.addEventListener('deviceready', start, false);
  setTimeout(function () {
    if (!started) {
      showStartupError('Capacitor did not finish loading the native plugins. Run cap sync and rebuild the app.');
    }
  }, 15000);
}(window));
