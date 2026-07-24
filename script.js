const state = {
  references: [],
  filtered: []
};

const list = document.getElementById("referenceList");
const searchInput = document.getElementById("searchInput");
const yearFilter = document.getElementById("yearFilter");
const countSummary = document.getElementById("countSummary");
const toggleNotes = document.getElementById("toggleNotes");
const copyAllTex = document.getElementById("copyAllTex");
const copyAllBib = document.getElementById("copyAllBib");
let allBibText = "";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function setReferencesOnly(enabled) {
  document.body.classList.toggle("references-only", enabled);
  toggleNotes.textContent = enabled ? "Show full notes" : "Reference-only view";
}

function copyText(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const original = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = original; }, 1100);
  });
}

function render() {
  const q = searchInput.value.trim().toLowerCase();
  const y = yearFilter.value;
  state.filtered = state.references.filter(ref => {
    const haystack = [ref.title, ref.authors, ref.venue, ref.display_text].join(" ").toLowerCase();
    return (!q || haystack.includes(q)) && (!y || ref.year === y);
  });
  countSummary.textContent = `${state.filtered.length} of ${state.references.length} references shown`;
  list.innerHTML = state.filtered.map(ref => {
    const link = ref.doi ? `https://doi.org/${encodeURIComponent(ref.doi)}` : ref.url;
    const title = ref.title || `Reference ${ref.order}`;
    const meta = [
      ref.year && `<span class="pill">${escapeHtml(ref.year)}</span>`,
      ref.venue && `<span class="pill">${escapeHtml(ref.venue)}</span>`,
      ref.volume && `<span class="pill">vol. ${escapeHtml(ref.volume)}</span>`,
      ref.number && `<span class="pill">no. ${escapeHtml(ref.number)}</span>`,
      ref.pages && `<span class="pill">pp. ${escapeHtml(ref.pages)}</span>`
    ].filter(Boolean).join("");
    return `<article class="reference-card" id="${escapeHtml(ref.id)}">
      <h3>${ref.order}. ${escapeHtml(title)}</h3>
      ${ref.authors ? `<p><strong>Authors:</strong> ${escapeHtml(ref.authors)}</p>` : ""}
      <div class="reference-meta">${meta}</div>
      <p>${escapeHtml(ref.display_text)}</p>
      <div class="card-actions">
        <button type="button" data-copy="original" data-id="${ref.id}">Copy original TeX</button>
        <button type="button" data-copy="display" data-id="${ref.id}">Copy display text</button>
        <button type="button" data-copy="bibtex" data-id="${ref.id}">Copy BibTeX</button>
        ${link ? `<a class="button" href="${escapeHtml(link)}" target="_blank" rel="noopener">Open DOI or source URL</a>` : `<button type="button" disabled>No DOI or source URL</button>`}
      </div>
      <details>
        <summary>Original TeX</summary>
        <pre><code>${escapeHtml(ref.original_tex)}</code></pre>
      </details>
      <details>
        <summary>BibTeX</summary>
        <pre><code>${escapeHtml(ref.bibtex)}</code></pre>
      </details>
    </article>`;
  }).join("");
}

list.addEventListener("click", event => {
  const button = event.target.closest("button[data-copy]");
  if (!button) return;
  const ref = state.references.find(item => item.id === button.dataset.id);
  if (!ref) return;
  const key = button.dataset.copy;
  const text = key === "original" ? ref.original_tex : key === "display" ? ref.display_text : ref.bibtex;
  copyText(text, button);
});

searchInput.addEventListener("input", render);
yearFilter.addEventListener("change", render);

toggleNotes.addEventListener("click", () => {
  setReferencesOnly(!document.body.classList.contains("references-only"));
  location.hash = "references";
});

copyAllTex.addEventListener("click", () => {
  copyText(state.references.map(ref => ref.original_tex).join("\n\n"), copyAllTex);
});

copyAllBib.addEventListener("click", () => {
  copyText(allBibText || state.references.map(ref => ref.bibtex).join("\n\n"), copyAllBib);
});

fetch("references.bib")
  .then(response => response.text())
  .then(text => { allBibText = text; })
  .catch(() => { allBibText = ""; });

fetch("references.json")
  .then(response => response.json())
  .then(data => {
    state.references = data;
    const years = [...new Set(data.map(ref => ref.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    yearFilter.insertAdjacentHTML("beforeend", years.map(year => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join(""));
    const params = new URLSearchParams(location.search);
    setReferencesOnly(params.get("view") === "references");
    render();
  });
