'use strict';

(function () {
  let firstDataSource = null;

  $(document).ready(function () {
    tableau.extensions.initializeAsync()
      .then(() => {
        const dashboard = tableau.extensions.dashboardContent.dashboard;
        const fetchPromises = [];

        dashboard.worksheets.forEach(ws => {
          fetchPromises.push(ws.getDataSourcesAsync());
        });

        Promise.all(fetchPromises)
          .then(results => {
            const allDataSources = [];
            results.forEach(arr => {
              arr.forEach(ds => allDataSources.push(ds));
            });

            if (allDataSources.length === 0) {
              console.error('No data sources found.');
            } else {
              firstDataSource = allDataSources[0];
              console.log('First data source:', firstDataSource.name);
            }
          })
          .catch(err => {
            console.error('Error fetching data sources:', err);
          });
      })
      .catch(err => {
        console.error('Error initializing extension:', err);
      });

    $('#approveButton').click(() => {
      if (!firstDataSource) {
        alert('No data source available yet.');
        return;
      }
      const timestamp = getChicagoTimestamp();
      const sqlStatement = `UPDATE ANIMALS_TABLE SET last_approval_time = '${timestamp}'`;
      executeDDL(sqlStatement, () => {
        alert('Approval timestamp updated successfully!');
      });
    });

    $('#refreshButton').click(() => {
      if (!firstDataSource) {
        alert('No data source found to refresh.');
        return;
      }
      firstDataSource.refreshAsync()
        .then(() => {
          alert('Data is successfully refreshed now!');
        })
        .catch(err => {
          console.error('Refresh error:', err);
          alert('Failed to refresh data source.');
        });
    });

    $('#infoIcon').click(() => {
      if (!firstDataSource) {
        alert('No data source found to display info.');
        return;
      }
      showDataSourceInfo(firstDataSource);
    });
  });

  function getChicagoTimestamp() {
    const now = new Date();
    const localStr = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const localDate = new Date(localStr);

    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hour = String(localDate.getHours()).padStart(2, '0');
    const minute = String(localDate.getMinutes()).padStart(2, '0');
    const second = String(localDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  function executeDDL(sql, onSuccess) {
    fetch('/executeDDL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ddl: sql })
    })
      .then(resp => {
        if (!resp.ok) {
          throw new Error(`Server error: ${resp.status}`);
        }
        return resp.json();
      })
      .then(() => {
        if (onSuccess) onSuccess();
      })
      .catch(err => {
        console.error('Error executing DDL:', err);
        alert(`Error updating approval timestamp: ${err.message}`);
      });
  }

  function showDataSourceInfo(ds) {
    $('#nameDetail').text(ds.name);
    $('#idDetail').text(ds.id);
    $('#typeDetail').text(ds.isExtract ? 'Extract' : 'Live');

    let fieldList = ds.fields.map(f => f.name).join(', ');
    $('#fieldsDetail').text(fieldList);

    ds.getConnectionSummariesAsync().then(conns => {
      let connList = conns.map(c => `${c.name}: ${c.type}`).join(', ');
      $('#connectionsDetail').text(connList);
    });

    ds.getActiveTablesAsync().then(tables => {
      let tableList = tables.map(t => t.name).join(', ');
      $('#activeTablesDetail').text(tableList);
    });

    $('#infoModal').modal('show');
  }
})();