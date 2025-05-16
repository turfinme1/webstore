import * as pageUtility from "./page-utility.js";
import { PreferenceBuilder } from "./preference-builder.js";

const state = {
    userStatus: null,
}

const elements = {
    mainContainer: document.getElementById('main-container'),
}

document.addEventListener("DOMContentLoaded", async () => {
    state.userStatus = await pageUtility.getUserStatus();
    pageUtility.createNavigation(state.userStatus);
    pageUtility.createBackofficeNavigation(state.userStatus);

    const URLParams = new URLSearchParams(window.location.search);
    const reportName = URLParams.get('report');

    if ( ! pageUtility.hasPermission(state.userStatus, "read", reportName)) {
        elements.mainContainer.innerHTML = "";
        const h1 = document.createElement("h1");
        h1.innerText = "You don't have permission to view this report";
        elements.mainContainer.appendChild(h1);
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
        elements.mainContainer.innerHTML = "";
        const h1 = document.createElement("h1");
        h1.innerText = "Failed to load report";
        elements.mainContainer.appendChild(h1);
        return;
    }

    const reportConfig = await reportConfigResponse.json();
    reportConfig.reportUIConfig.filters = reportConfig.reportFilters;
    const builder = new PreferenceBuilder(reportName, reportConfig.reportUIConfig);
    await builder.render("main-container");
});