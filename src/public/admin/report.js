import { fetchUserSchema, createNavigation, hasPermission, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling } from "./page-utility.js";
import { ReportBuilder } from "./report-builder.js";

const state = {
    userStatus: null,
}

const elements = {
    mainContainer: document.getElementById('main-container'),
}

document.addEventListener("DOMContentLoaded", async () => {
    state.userStatus = await getUserStatus();
    createNavigation(state.userStatus);
    createBackofficeNavigation(state.userStatus);

    const URLParams = new URLSearchParams(window.location.search);
    const reportName = URLParams.get('report');

    if (!hasPermission(state.userStatus, "read", reportName)) {
        elements.mainContainer.innerHTML = "<h1>You don't have permission to view this report</h1>";
        return;
    }

    const reportConfigResponse = await fetch(`/api/reports/${reportName}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ metadataRequest: true}),
        }
    );
    if ( ! reportConfigResponse.ok) {
        elements.mainContainer.innerHTML = "<h1>Failed to load report</h1>";
        return;
    }
    const reportConfig = await reportConfigResponse.json();

    const prefResponse = await fetch(`/api/reports/${reportName}/preferences`);
    let hideColumns = {};
    if (prefResponse.ok) {
        const prefData = await prefResponse.json();
        if (prefData.rows[0]?.preference?.headerGroups) {
            for (const col of prefData.rows[0]?.preference?.headerGroups) {
                if (col.hideInUI) {
                    hideColumns[col.key] = true;
                }
            }

            const orderMap = new Map(
                prefData.rows[0]?.preference?.headerGroups.map((p, index) => [p.key, index])
            );

            let cols = reportConfig.reportUIConfig.headerGroups[0]
                .filter(col => !hideColumns[col.key]);

            cols.sort((a, b) => {
                const ia = orderMap.has(a.key) ? orderMap.get(a.key) : Number.MAX_SAFE_INTEGER;
                const ib = orderMap.has(b.key) ? orderMap.get(b.key) : Number.MAX_SAFE_INTEGER;
                return ia - ib;
            });

            reportConfig.reportUIConfig.headerGroups = [ cols ];
        }
    }

    reportConfig.reportUIConfig.filters = reportConfig.reportFilters;

    const reportUI = new ReportBuilder(reportConfig.reportUIConfig);
    await reportUI.render('main-container');
});