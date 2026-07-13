let rows = [];
var currentRow = null;

let titleColumn = null;
let subtitleColumn = null;
let thumbnailColumn = null;
let bodyColumns = [];
let badgeColumns = [];

const cardsContainer = document.getElementById("cards");

let access = {};
let tableId = null;
let columnMetaData = null;
let columnWidgetOptions = {};

async function initialize() {
    try {
        access = await grist.docApi.getAccessToken({ readOnly: true });
        tableId = await grist.getSelectedTableId();

        const response = await fetch(
            `${access.baseUrl}/tables/${tableId}/columns?hidden=1&auth=${access.token}`
        );
        columnMetaData = await response.json();

        for (col of columnMetaData.columns)
        {
            if (col.fields && col.fields.widgetOptions)
                columnWidgetOptions[col.id] = JSON.parse(col.fields.widgetOptions);
        }

        render();
    }
    catch (e) {
        console.error(e);
    }
}

grist.ready({
    requiredAccess: "read table",
    allowSelectBy: true,
    columns: [
        {
            name: "Title",
            title: "Title Column"
        },
        {
            name: "Subtitle",
            title: "Subtitle Column",
            optional: true
        },
        {
            name: "Thumbnail",
            title: "Thumbnail Column",
            optional: true
        },
        {
            name: "Body",
            title: "Body Columns",
            allowMultiple: true,
            optional: true
        },
        {
            name: "Badges",
            title: "Badge Columns",
            allowMultiple: true,
            optional: true
        }
    ]
});

grist.onRecords(function (records, mappings) {
    rows = records || [];

    titleColumn = mappings.Title ?? null;
    subtitleColumn = mappings.Subtitle ?? null;
    thumbnailColumn = mappings.Thumbnail ?? null;
    bodyColumns = mappings.Body ?? [];
    badgeColumns = mappings.Badges ?? [];

    render();
});

grist.onRecord(function (record) {
    document.querySelectorAll(".card").forEach(function (el) { el.classList.remove("current"); });
    var r = document.getElementById("row_card_" + record.id);
    if (r)
        r.classList.add('current');
    currentRow = record.id;
});

function attachmentUrl(id) {
    if (!id || !access.token || !access.baseUrl)
        return null;

    return `${access.baseUrl}/attachments/${id}/download?auth=${access.token}`;
}

function renderThumbnail(row) {
    if (!thumbnailColumn)
        return "";

    const attachmentId = row[thumbnailColumn]?.[0];

    if (!attachmentId)
        return "";

    return `
        <img class="thumbnail"
            src="${attachmentUrl(attachmentId)}"
            loading="lazy">
    `;
}

function renderBadge(column, value) {
    if (Array.isArray(value)) {
        return value.map(v => renderBadge(column, v)).join(" ");
    }

    const opts = columnWidgetOptions[column];
    const style = opts?.choiceOptions?.[value];

    const bg = style?.fillColor;
    const fg = style?.textColor;

    const css = [
        bg ? `background:${bg};` : "",
        fg ? `color:${fg};` : (bg ? `color: contrast-color(${bg});` : "")
    ].filter(Boolean).join(";");

    return `<span class="badge" style="${css}">${value}</span>`;
}

function renderBodyField(col, value) {
    let html = `<b>${col.replaceAll("_", " ")}:</b> `;

    const opts = columnWidgetOptions[col];
    if (opts?.choiceOptions)
        html += renderBadge(col, value);
    else
        html += value;

    return html;
}

function render() {
    cardsContainer.innerHTML = "";
    rows.forEach(function (r) {
        const thumbnail = renderThumbnail(r);
        const title = titleColumn ? (r[titleColumn] ?? "") : "";
        const subtitle = subtitleColumn ? (r[subtitleColumn] ?? "") : "";

        const body = bodyColumns
            .filter(col => r[col] != null && r[col] !== "")
            .map(col => renderBodyField(col, r[col]))
            .join("<br>");

        const badges = badgeColumns
            .filter(col => r[col])
            .map(col => renderBadge(col, r[col]))
            .join("");

        const c = document.createElement("div");
        c.className = "card";
        c.id = "row_card_" + r.id;
        if (currentRow == r.id)
            c.classList.add('current');
        c.innerHTML = `
<div class="title">${title}</div>

${thumbnail}

${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}

${body ? `<div class="meta">${body}</div>` : ""}

${badges ? `<div class="badges">${badges}</div>` : ""}
        `;

        c.onclick = () => {
            if (r.id) { grist.setCursorPos({ rowId: r.id }); }
        };
        cardsContainer.appendChild(c);
    });
}

initialize();