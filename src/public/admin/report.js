import { fetchUserSchema, createNavigation, createBackofficeNavigation, populateFormFields, createForm, attachValidationListeners, getUserStatus, fetchWithErrorHandling, showToastMessage } from "./page-utility.js";
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

    // if (!hasPermission(state.userStatus, "read", reportName)) {
    //     elements.mainContainer.innerHTML = "<h1>You don't have permission to view this report</h1>";
    //     return;
    // }

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
    reportConfig.reportUIConfig.filters = reportConfig.reportFilters;
    const reportUI = new ReportBuilder(reportConfig.reportUIConfig);
    await reportUI.render('main-container');
});