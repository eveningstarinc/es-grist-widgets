let rows = [];
var currentRow = null;

let titleColumn = null;
let subtitleColumn = null;
let thumbnailColumn = null;
let bodyColumns = [];
let badgeColumns = [];

const cardsContainer = document.getElementById("cards");

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
            title: "Subtitle Column"
        },
        {
            name: "Thumbnail",
            title: "Thumbnail Column"
        },
        {
            name: "Body",
            title: "Body Columns",
            allowMultiple: true
        },
        {
            name: "Badges",
            title: "Badge Columns",
            allowMultiple: true
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

    render(rows);
});

grist.onRecord(function (record) {
    document.querySelectorAll(".card").forEach(function (el) { el.classList.remove("current"); });
    var r = document.getElementById("row_card_" + record.id);
    if (r)
        r.classList.add('current');
    currentRow = record.id;
});

function render(rows) {
    cardsContainer.innerHTML = "";
    rows.forEach(function (r) {
        const thumbnail = "";
        const title = titleColumn ? (r[titleColumn] ?? "") : "";
        const subtitle = subtitleColumn ? (r[subtitleColumn] ?? "") : "";

        const body = bodyColumns
            .filter(col => r[col] != null && r[col] !== "")
            .map(col => `<b>${col}:</b> ${r[col]}`)
            .join("<br>");

        const badges = badgeColumns
            .filter(col => r[col])
            .map(col => `<span class="badge">${r[col]}</span>`)
            .join("");

        const c = document.createElement("div");
        c.className = "card";
        c.id = "row_card_" + r.id;
        if (currentRow == r.id)
            c.classList.add('current');
        c.innerHTML = `
        ${thumbnail}

<div class="title">${title}</div>

${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}

${body ? `<div class="meta">${body}</div>` : ""}

${badges ? `<div class="badges">${badges}</div>` : ""}
        `;

        c.onclick = () => {
            if (r.id) { grist.setCursorPos({ rowId: r.id }); }
        };
        cards.appendChild(c);
    });
}