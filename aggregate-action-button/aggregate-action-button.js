let actionColumn = null;
let labelColumn = null;
let rows = [];

const app = document.getElementById("app");
let statusText = "waiting";
let result = null;
let inputs = [];
let running = false;

function handleError(err) {
    console.error('ERROR', err);
    statusText = String(err).replace(/^Error: /, '');

    render();
}

async function applyActions(actions) {
    if (running)
        return;

    running = true;
    result = "Working...";
    render();

    try {
        await grist.docApi.applyUserActions(actions);
        result = 'Done';
    } catch (e) {
        result = `Please grant full access for writing. (${e})`;
    }

    running = false;
    render();
}

function render() {
    if (statusText) {
        app.innerHTML = `
            <div class="status">
                ${statusText === "waiting"
                    ? "<p>Waiting for data...</p>"
                    : statusText}
            </div>
        `;
        return;
    }

    const buttonEnabled = btn.actions.length > 0 && !running;

    app.innerHTML = `
        <div class="container">
            ${inputs.map((btn, i) => `
                <button class="button"
                        ${!buttonEnabled ? "disabled" : ""}
                        data-index="${i}">
                    ${btn.button}
                </button>
            `).join("")}
        </div>

        <div class="description"></div>

        ${result
            ? `<div class="result">${result}</div>`
            : ""}
    `;

    const desc = app.querySelector(".description");

    app.querySelectorAll(".button").forEach(btn => {
        const index = Number(btn.dataset.index);

        if (buttonEnabled)
            btn.onclick = () => applyActions(inputs[index].actions);

        btn.onmouseenter = () => {
            desc.textContent = inputs[index].description;
        };

        btn.onmouseleave = () => {
            desc.textContent = "";
        };
    });
}

function onRecords(records, mappings) {
    actionColumn = mappings.Actions;
    labelColumn = mappings.Label;

    inputs = [];

    if (!actionColumn) {
        statusText = "Please choose an Action column.";
        render();
        return;
    }

    rows = records;

    try {
        statusText = '';
        result = null;
        const allActions = [];
        let hasActionCount = 0;
        const mergedBtn = [
            {
                "button": "",
                "description": "",
                "actions": []
            }
        ];

        for (const row of rows) {
            let btns = row[actionColumn]
            if (!btns)
                continue;

            // If only one action button is defined, put it within an Array
            if (!Array.isArray(btns))
                btns = [btns]

            const keys = ['button', 'description', 'actions'];
            for (const btn of btns) {
                if (!btn || keys.some(k => !btn[k])) {
                    const allKeys = keys.map(k => JSON.stringify(k)).join(", ");
                    const missing = keys.filter(k => !btn?.[k]).map(k => JSON.stringify(k)).join(", ");
                    const gristName = actionColumn;
                    throw new Error(`"${gristName}" cells should contain an object with keys ${allKeys}. ` +
                        `Missing keys: ${missing}`);
                }

                if (btn.actions.length > 0) {
                    allActions.push(...btn.actions);
                    hasActionCount++;
                }
            }
        }

        const label = labelColumn ? rows[0]?.[labelColumn] : "";
        const actionWord = allActions.length === 1 ? "action" : "actions";
        const recordWord = hasActionCount === 1 ? "record" : "records";

        mergedBtn[0].button = label || `Run ${allActions.length} Actions`;
        mergedBtn[0].description = `Runs ${allActions.length} ${actionWord} across ${hasActionCount} selected ${recordWord}`;
        mergedBtn[0].actions = allActions;
        inputs = mergedBtn;

        render();
    } catch (err) {
        handleError(err);
    }
}

grist.ready({
    requiredAccess: "full",
    columns: [
        {
            name: "Actions",
            title: "Action Column"
        },
        {
            name: "Label",
            title: "Button Label",
            optional: true
        }
    ]
});
grist.onRecords(onRecords);

render();