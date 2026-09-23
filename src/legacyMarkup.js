export const legacyMarkup = `
  <div class="app">
    <div class="topbar">
      <div class="brand">
        <h1><span>●</span> Paint Shop — System <span>Digital Twin</span> · 3D</h1>
        <p>REFERENCE FLOW · COMPONENT INPUT → FINAL GOOD · DRAG TO ORBIT · CLICK A MACHINE FOR DETAILS</p>
      </div>
      <div class="clock"><span class="status-dot"></span>SIM CLOCK <b id="simClock">00:00</b> &nbsp;·&nbsp; <span
          id="runState">RUNNING</span></div>
    </div>

    <div class="main">
      <div class="left-col" style="flex:1; display:flex; flex-direction:column; min-width:0; border-right: 1px solid var(--line);">
        <div class="stage-wrap" style="flex:1;">
          <div id="loading">LOADING 3D SCENE…</div>
          <div id="three-canvas"></div>
          <button id="btnFocusBooth" class="focus-booth-btn" title="Show the Painting Booth inside the line view" onclick="if(window.__toggleBoothOverlay) window.__toggleBoothOverlay()">
            Painting Booth View
          </button>
          <button id="btnLineFocus" class="line-focus-btn" title="View the Paint Shop line full screen" aria-label="View the Paint Shop line full screen" onclick="if(window.__toggleLineFocus) window.__toggleLineFocus()">
            ⛶
          </button>
          <div class="orbit-hint">Drag to orbit · Scroll to zoom · Click a machine block for details</div>
          <div id="booth-inline-slot"></div>
        </div>

        <!-- Live Database Stats Section -->
        <div class="live-stats-panel" style="margin: 0; border-radius: 0; border-left: none; border-bottom: none; border-right: none; flex: 1; min-height: 0; display: flex; flex-direction: column;">
          <div class="live-stats-header">
            <h2>Live Postgres Production Database</h2>
            <div class="live-stats-indicator"><span class="pulse-dot"></span>LIVE</div>
          </div>
          
          <div class="datewise-panel" style="flex: 1; min-height: 0;">
            <div class="live-table-container">
              <div style="display: flex; gap: 16px; margin-bottom: 8px;">
                <div class="stat-card" style="flex: 1;">
                  <div class="stat-lbl">Total Production Runs</div>
                  <div class="stat-num" id="dbTotalCount">0</div>
                </div>
                <div class="stat-card" style="flex: 1;">
                  <div class="stat-lbl">Total Components Produced</div>
                  <div class="stat-num" id="dbTotalProduced">0</div>
                </div>
              </div>
              <div style="display: flex; gap: 16px; flex: 1; min-height: 0; min-width: 0;">
                <div class="table-container" style="flex: 1;">
                  <table class="live-table live-table-main">
                    <thead>
                      <tr>
                        <th style="min-width: 70px;">Run ID</th>
                        <th style="min-width: 110px;">Component</th>
                        <th style="min-width: 105px;">Status</th>
                        <th style="min-width: 150px;">Date & Time</th>
                        <th style="min-width: 65px;">OEE</th>
                        <th style="min-width: 65px;">Avail.</th>
                        <th style="min-width: 65px;">Perf.</th>
                        <th style="min-width: 85px;">Total Count</th>
                        <th style="min-width: 80px;">OK Count</th>
                        <th style="min-width: 80px;">Downtime</th>
                      </tr>
                    </thead>
                    <tbody id="dbRecentRows">
                      <tr><td colspan="10" style="text-align:center;color:#666;">Waiting for data...</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="table-container" style="flex: 0 0 240px;">
                  <table class="live-table">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody id="dbComponentTotals">
                      <tr><td colspan="2" style="text-align:center;color:#666;">Waiting for data...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Datewise OEE Dashboard -->
            <div class="datewise-card">
              <div class="dw-header">DATA</div>
              <div class="dw-date-picker" style="gap:6px;">
                <span style="font-size:11px;">📅 Date:</span>
                <input type="date" id="dwDatePicker" style="background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:4px 8px;font-family:inherit;font-size:12px;outline:none;flex:1;">
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
                <div class="dw-row"><span class="dw-row-lbl">OEE:</span><span class="dw-row-val" id="dwOee">--%</span></div>
                <div class="dw-row"><span class="dw-row-lbl">Availability:</span><span class="dw-row-val" id="dwAvail">--%</span></div>
                <div class="dw-row"><span class="dw-row-lbl">Performance:</span><span class="dw-row-val" id="dwPerf">--%</span></div>
                <div class="dw-row"><span class="dw-row-lbl">Quality:</span><span class="dw-row-val" id="dwQual">--%</span></div>
                <div class="dw-row"><span class="dw-row-lbl">Avg UPH:</span><span class="dw-row-val" id="dwUph">--</span></div>
                <div class="dw-row"><span class="dw-row-lbl">Downtime:</span><span class="dw-row-val" id="dwDowntime">-- min</span></div>
                <div class="dw-row dw-row-total"><span class="dw-row-lbl">Total Produced:</span><span class="dw-row-val" id="dwTotal">--</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" style="overflow-y: auto;">
        <div class="panel-section">
          <h2>Simulation Control</h2>
          <div class="controls">
            <button class="primary" id="btnPlay">Start</button>
            <div style="display:flex;gap:4px;align-items:center;">
              <select id="compType"
                style="background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:3px;padding:4px;font-family:inherit;font-size:11px;cursor:pointer;">
              </select>
              <button id="btnNewType" title="Create new component type" style="padding:4px 8px;">+</button>
              <input type="number" id="bulkCount" value="1" min="1" max="100" title="Bulk amount"
                style="width:45px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:3px;padding:4px;font-family:inherit;font-size:11px;">
              <button id="btnAdd">Add</button>
            </div>
            <button id="btnDowntime">⚠ Simulate Downtime</button>
            <button id="btnReset">Reset</button>
          </div>
          <div class="slider-row">Speed <span class="val" id="speedVal">1.0×</span>
            <input type="range" id="speedSlider" min="0.25" max="3" step="0.25" value="1">
          </div>
          <div class="slider-row" style="margin-bottom:8px;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" id="chkAutoFeed" checked>
              Continuous Auto-feed
            </label>
          </div>
          <div class="slider-row">Entry interval (Ideal Cycle Time) <span class="val" id="intervalVal">6 min</span>
            <input type="range" id="intervalSlider" min="2" max="15" step="1" value="6">
          </div>
        </div>

        <div class="panel-section">
          <h2>Line Status</h2>
          <div class="kpi-grid">
            <div class="kpi">
              <div class="lbl">Input Components</div>
              <div class="num" id="kpiInputComponents">0</div>
            </div>
            <div class="kpi">
              <div class="lbl">WIP (in line)</div>
              <div class="num amber" id="kpiWip">0</div>
            </div>
            <div class="kpi">
              <div class="lbl">Output Components</div>
              <div class="num amber" id="kpiOutputComponents">0</div>
            </div>
          </div>
        </div>

        <div class="panel-section">
          <h2>Shift &amp; PPT Setup</h2>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <label style="font-size:11px;color:var(--muted);white-space:nowrap;">Shift Length (min)</label>
              <input type="number" id="shiftLength" value="480" min="60" max="1440" step="30"
                style="width:72px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:3px;padding:5px 7px;font-family:inherit;font-size:11px;text-align:right;">
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <label style="font-size:11px;color:var(--muted);white-space:nowrap;">Planned DT (min) <span style="font-size:9px;opacity:.6;">(breaks + maint.)</span></label>
              <input type="number" id="plannedDT" value="30" min="0" max="480" step="5"
                style="width:72px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:3px;padding:5px 7px;font-family:inherit;font-size:11px;text-align:right;">
            </div>
            <div style="font-size:10px;color:var(--muted);background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:6px 8px;">
              PPT = Shift Length − Planned DT
              &nbsp;→&nbsp;<b id="mPPTCalc" style="color:var(--amber);">450 min</b>
            </div>
          </div>
        </div>

        <div class="panel-section" style="background:var(--panel);">
          <h2>OEE Performance</h2>
          <div class="oee-headline">
            <div class="oee-num" id="kpiOEE">0%</div>
            <div class="oee-lbl">Overall Equipment<br>Effectiveness</div>
          </div>
          <div class="kpi-grid" style="margin-top:10px;">
            <div class="kpi">
              <div class="lbl">Availability</div>
              <div class="num" id="kpiAvail">0%</div>
            </div>
            <div class="kpi">
              <div class="lbl">Performance</div>
              <div class="num" id="kpiPerf">0%</div>
            </div>
            <div class="kpi">
              <div class="lbl">Quality</div>
              <div class="num" id="kpiQual">0%</div>
            </div>
            <div class="kpi">
              <div class="lbl">UPH</div>
              <div class="num amber" id="kpiUPH">0.0</div>
            </div>
          </div>
          <div class="metric-list" style="margin-top:12px;">
            <div class="metric-row"><span>Shift Length</span><b id="mShiftLen">480 min</b></div>
            <div class="metric-row"><span>Planned DT (breaks/maint.)</span><b id="mPlanDT">30 min</b></div>
            <div class="metric-row" style="border-bottom:1px solid var(--amber)33;"><span style="color:var(--amber);">PPT (Shift − Planned DT)</span><b id="mPPT" style="color:var(--amber);">0 min</b></div>
            <div class="metric-row"><span>Elapsed Sim Time</span><b id="mElapsed">0 min</b></div>
            <div class="metric-row"><span>Unplanned Downtime</span><b id="mDowntime">0 min</b></div>
            <div class="metric-row" style="border-bottom:1px solid var(--blue)33;"><span style="color:var(--blue);">Run Time (PPT − Unplanned DT)</span><b id="mRunTime" style="color:var(--blue);">0 min</b></div>
            <div class="metric-row"><span>Ideal Cycle Time</span><b id="mIdealCT">0 min</b></div>
            <div class="metric-row"><span>Average Cycle Time</span><b id="mAvgCT">0 min</b></div>
            <div class="metric-row"><span>Expected Count (Without Downtime)</span><b id="mExpected">0</b></div>
            <div class="metric-row"><span>Expected Count (With Downtime)</span><b id="mExpectedDT">0</b></div>
            <div class="metric-row"><span>Total Count</span><b id="mTotal">0</b></div>
            <div class="metric-row"><span>OK Count</span><b id="mOK">0</b></div>
          </div>
        </div>

        <div class="panel-section event-log-panel" style="border-bottom:none;flex:1;display:flex;flex-direction:column;min-height:0;">
          <h2>Event Log</h2>
          <div class="log" id="log"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" id="modalBackdrop">
    <div class="modal">
      <div class="modal-head">
        <div>
          <span class="tag" id="modalTag">CATEGORY</span>
          <h3 id="modalTitle">Stage Name</h3>
        </div>
        <button class="close" id="modalClose">✕</button>
      </div>
      <div class="modal-body">
        <p id="modalDesc"></p>
        <div class="modal-stats" id="modalStats"></div>
      </div>
    </div>
  </div>

  <!-- Downtime configuration modal -->
  <div id="dtModalBackdrop">
    <div id="dtModal">
      <div class="dt-head">
        <h3>⚠ Simulate Downtime</h3>
        <button class="close" id="dtModalClose">✕</button>
      </div>
      <div class="dt-body">
        <label class="section">Select machines affected</label>
        <div class="select-all-row">
          <button id="dtSelectAll">Select All</button>
          <button id="dtClearAll">Clear</button>
        </div>
        <div class="machine-list" id="dtMachineList"></div>
        <label class="section">Downtime duration</label>
        <div class="dur-row">
          <label for="dtDuration">Duration (minutes):</label>
          <input type="number" id="dtDuration" value="5" min="1" max="480" placeholder="e.g. 30">
        </div>
        <div class="dt-actions">
          <button class="btn-cancel" id="dtModalCancel">Cancel</button>
          <button class="btn-start" id="dtModalStart">⚠ Start Downtime</button>
        </div>
      </div>
    </div>
  </div>
`;
