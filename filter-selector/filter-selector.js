let rows = [];
let searchColumns = [];
let filterColumns = [];
let lastSearchColumns = [];
let lastFilterColumns = [];
let filterControls = {};

const filtersContainer = document.getElementById("filters");
const searchInput = document.getElementById("search_input");
const countContainer = document.getElementById("count");

filtersContainer.innerHTML = "";

grist.ready({
    requiredAccess: "read table",
    allowSelectBy: true,
    columns: [
        {
            name: "Search",
            title: "Search Columns",
            allowMultiple: true
        },
        {
            name: "Filters",
            title: "Filter Columns",
            allowMultiple: true
        }
    ]
});

function arraysEqual(a, b) {
    if (a.length !== b.length)
        return false;

    return a.every((v, i) => v === b[i]);
}

function fillSelect(select, col) {
    const values = [...new Set(
        rows.map(r => String(r[col] ?? "")).filter(Boolean)
    )].sort();

    for (const value of values) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    }
}

function refreshFilters() {
    for (const [col, select] of Object.entries(filterControls)) {
        const previous = select.value;

        select.innerHTML =
            `<option value="">[Filter by ${col.replaceAll("_", " ")}]</option>`;

        fillSelect(select, col);

        if ([...select.options].some(o => o.value === previous))
            select.value = previous;
    }
}

function rebuildControls(searchColumns, filterColumns) {
    searchInput.style.display = searchColumns.length ? "" : "none";
    searchInput.removeEventListener("input");
    if (searchColumns.length > 0)
        searchInput.addEventListener("input", commitFilters);
    else
        searchInput.value = "";

    filtersContainer.innerHTML = "";
    filterControls = {};

    for (const col of filterColumns) {
        const select = document.createElement("select");
        select.addEventListener("change", commitFilters);
        filterControls[col] = select;
        filtersContainer.appendChild(select);
    }
}

function checkSearch(r, terms)
{
    const text = searchColumns
        .map(col => String(r[col] ?? ""))
        .join(" ")
        .toLowerCase();

    return terms.every(t => text.includes(t));
}

function checkFilters(r)
{
    for (const [col, control] of Object.entries(filterControls)) {
        if (control.value &&
            String(r[col] ?? "") !== control.value)
            return false;
    }

    return true;
}

function commitFilters() {
    const terms = searchInput.value
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const filtered = rows.filter(r => {
        return checkSearch(r, terms) && checkFilters(r);
    });

    countContainer.textContent = `Matched ${filtered.length} Results`;

    let filteredIds = filtered.map(v => v.id);
    grist.setSelectedRows(filteredIds);
}

grist.onRecords(function (records, mappings) {
    rows = records.map(r => grist.mapColumnNames(r));
    searchColumns = mappings.Search || [];
    filterColumns = mappings.Filters || [];

    console.log(mappings);
    console.log(searchColumns);
    console.log(filterColumns);
    console.log(rows[0]);

    if (!arraysEqual(searchColumns, lastSearchColumns) ||
        !arraysEqual(filterColumns, lastFilterColumns)) {

        lastSearchColumns = [...searchColumns];
        lastFilterColumns = [...filterColumns];

        rebuildControls(searchColumns, filterColumns);
    }
    refreshFilters();
    commitFilters();
});
