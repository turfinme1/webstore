import { getUserStatus, attachLogoutHandler, hasPermission } from "./auth.js";
import { createNavigation, createBackofficeNavigation } from "./navigation.js";
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
    await attachLogoutHandler();
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
    const reportUI = new ReportBuilder(reportConfig.reportUIConfig);
    reportUI.render('main-container');
});