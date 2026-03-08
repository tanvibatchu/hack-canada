/**
 * lib/academicSearch.ts
 * Searches only pre-approved SLP academic journals.
 */

export interface AcademicSource {
  title: string;
  authors: string;
  year: number | string;
  journal: string;
  abstract: string;
  url: string;
  source: "pubmed" | "semantic" | "eric" | "openalex";
  openAccess: boolean;
}

const TIER_1_PUBMED = [
  '"J Speech Lang Hear Res"[Journal]',
  '"Am J Speech Lang Pathol"[Journal]',
  '"Lang Speech Hear Serv Sch"[Journal]',
  '"Int J Lang Commun Disord"[Journal]',
  '"Child Lang Teach Ther"[Journal]',
];

const TIER_2_PUBMED = [
  '"J Child Lang"[Journal]',
  '"Dev Med Child Neurol"[Journal]',
  '"Int J Speech Lang Pathol"[Journal]',
  '"J Commun Disord"[Journal]',
  '"Clin Linguist Phon"[Journal]',
  '"Folia Phoniatr Logop"[Journal]',
];

const CONDITION_JOURNALS: Record<string, string[]> = {
  stutter:      ['"J Fluency Disord"[Journal]'],
  fluency:      ['"J Fluency Disord"[Journal]'],
  stammer:      ['"J Fluency Disord"[Journal]'],
  autism:       ['"J Autism Dev Disord"[Journal]'],
  asd:          ['"J Autism Dev Disord"[Journal]'],
  aac:          ['"Augment Altern Commun"[Journal]'],
  augmentative: ['"Augment Altern Commun"[Journal]'],
  apraxia:      ['"Brain Lang"[Journal]', '"Dev Med Child Neurol"[Journal]'],
  dysarthria:   ['"Brain Lang"[Journal]', '"Dev Med Child Neurol"[Journal]'],
  dyslexia:     ['"Dyslexia"[Journal]'],
  phonolog:     ['"J Exp Child Psychol"[Journal]'],
};

const SEMANTIC_VENUES = [
  "Journal of Speech, Language, and Hearing Research",
  "American Journal of Speech-Language Pathology",
  "Language Speech and Hearing Services in Schools",
  "International Journal of Language & Communication Disorders",
  "Child Language Teaching and Therapy",
  "Journal of Child Language",
  "Developmental Medicine & Child Neurology",
  "Journal of Communication Disorders",
  "Journal of Fluency Disorders",
  "Augmentative and Alternative Communication",
  "Clinical Linguistics & Phonetics",
];

function buildPubMedQuery(question: string, tier: 1 | 2 = 1): string {
  const lower = question.toLowerCase();
  const conditionJournals = Object.entries(CONDITION_JOURNALS)
    .filter(([kw]) => lower.includes(kw))
    .flatMap(([, journals]) => journals);
  const baseJournals = tier === 1 ? TIER_1_PUBMED : [...TIER_1_PUBMED, ...TIER_2_PUBMED];
  const allJournals = [...new Set([...baseJournals, ...conditionJournals])];
  const journalFilter = `(${allJournals.join(" OR ")})`;
  const cleanQ = question.replace(/[^\w\s]/g, " ").trim();
  return `(${cleanQ}) AND ${journalFilter} AND ("child"[MeSH] OR "children"[MeSH] OR "pediatric"[MeSH] OR "preschool"[MeSH])`;
}

async function searchPubMed(question: string): Promise<AcademicSource[]> {
  const sources: AcademicSource[] = [];
  try {
    let query = buildPubMedQuery(question, 1);
    let searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&sort=relevance&retmode=json`;
    let searchRes = await fetch(searchUrl);
    let searchData = await searchRes.json();
    let ids: string[] = searchData.esearchresult?.idlist ?? [];

    if (ids.length < 2) {
      query = buildPubMedQuery(question, 2);
      searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&sort=relevance&retmode=json`;
      searchRes = await fetch(searchUrl);
      searchData = await searchRes.json();
      ids = searchData.esearchresult?.idlist ?? [];
    }

    if (ids.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.slice(0, 3).join(",")}&retmode=json`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();

    const abstractText = await (await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.slice(0, 3).join(",")}&rettype=abstract&retmode=text`
    )).text();

    for (const id of ids.slice(0, 3)) {
      const doc = summaryData.result?.[id];
      if (!doc) continue;
      const authors = (doc.authors ?? []).slice(0, 3).map((a: { name: string }) => a.name).join(", ");
      sources.push({
        title: doc.title ?? "Untitled",
        authors: authors || "Unknown authors",
        year: doc.pubdate?.split(" ")[0] ?? "n.d.",
        journal: doc.fulljournalname ?? doc.source ?? "Unknown Journal",
        abstract: abstractText.replace(/\n/g, " ").trim().slice(0, 600),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        source: "pubmed",
        openAccess: doc.pmc != null,
      });
    }
  } catch (e) {
    console.error("PubMed search error:", e);
  }
  return sources;
}

async function searchSemanticScholar(question: string): Promise<AcademicSource[]> {
  const sources: AcademicSource[] = [];
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(question + " speech language children")}&fields=title,abstract,authors,year,venue,externalIds,openAccessPdf,isOpenAccess&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    for (const paper of (data.data ?? []).slice(0, 3)) {
      const venueMatch = SEMANTIC_VENUES.some(v =>
        paper.venue?.toLowerCase().includes(v.toLowerCase().slice(0, 20))
      );
      if (!venueMatch || !paper.abstract) continue;
      const doi = paper.externalIds?.DOI;
      const paperUrl = paper.openAccessPdf?.url ?? (doi ? `https://doi.org/${doi}` : `https://www.semanticscholar.org/paper/${paper.paperId}`);
      sources.push({
        title: paper.title ?? "Untitled",
        authors: (paper.authors ?? []).slice(0, 3).map((a: { name: string }) => a.name).join(", "),
        year: paper.year ?? "n.d.",
        journal: paper.venue ?? "Unknown Journal",
        abstract: (paper.abstract ?? "").slice(0, 600),
        url: paperUrl,
        source: "semantic",
        openAccess: paper.isOpenAccess ?? false,
      });
    }
  } catch (e) {
    console.error("Semantic Scholar error:", e);
  }
  return sources;
}

async function searchERIC(question: string): Promise<AcademicSource[]> {
  const sources: AcademicSource[] = [];
  try {
    const url = `https://api.ies.ed.gov/eric/?search=${encodeURIComponent(question + " speech language pathology children")}&fields=title,description,url,author,publicationdateyear,sourceid&rows=3&start=0`;
    const res = await fetch(url);
    const data = await res.json();
    for (const doc of (data.response?.docs ?? []).slice(0, 3)) {
      if (!doc.description) continue;
      sources.push({
        title: doc.title ?? "Untitled",
        authors: Array.isArray(doc.author) ? doc.author.slice(0, 3).join(", ") : (doc.author ?? "Unknown"),
        year: doc.publicationdateyear ?? "n.d.",
        journal: doc.sourceid ?? "ERIC",
        abstract: (doc.description ?? "").slice(0, 600),
        url: doc.url ?? `https://eric.ed.gov/?q=${encodeURIComponent(question)}`,
        source: "eric",
        openAccess: true,
      });
    }
  } catch (e) {
    console.error("ERIC search error:", e);
  }
  return sources;
}

async function searchOpenAlex(question: string): Promise<AcademicSource[]> {
  const sources: AcademicSource[] = [];
  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(question + " speech language children")}&filter=open_access.is_oa:true&per-page=3&mailto=articue@example.com`;
    const res = await fetch(url);
    const data = await res.json();
    for (const work of (data.results ?? []).slice(0, 3)) {
      if (!work.abstract_inverted_index) continue;
      const wordPositions: [string, number][] = [];
      for (const [word, positions] of Object.entries(work.abstract_inverted_index as Record<string, number[]>)) {
        for (const pos of positions) wordPositions.push([word, pos]);
      }
      wordPositions.sort((a, b) => a[1] - b[1]);
      const abstract = wordPositions.map(([w]) => w).join(" ").slice(0, 600);
      if (abstract.length < 50) continue;
      sources.push({
        title: work.title ?? "Untitled",
        authors: (work.authorships ?? []).slice(0, 3).map((a: { author: { display_name: string } }) => a.author.display_name).join(", "),
        year: work.publication_year ?? "n.d.",
        journal: work.primary_location?.source?.display_name ?? "Unknown Journal",
        abstract,
        url: work.doi ?? work.id ?? "",
        source: "openalex",
        openAccess: true,
      });
    }
  } catch (e) {
    console.error("OpenAlex error:", e);
  }
  return sources;
}

export async function searchAcademicSources(question: string): Promise<AcademicSource[]> {
  const [pubmedResults, semanticResults, ericResults] = await Promise.all([
    searchPubMed(question),
    searchSemanticScholar(question),
    searchERIC(question),
  ]);

  const all = [...pubmedResults, ...semanticResults, ...ericResults];
  const seen = new Set<string>();
  const deduped: AcademicSource[] = [];

  for (const source of all) {
    const key = source.title.toLowerCase().slice(0, 40);
    if (!seen.has(key)) { seen.add(key); deduped.push(source); }
  }

  if (deduped.length < 2) {
    const openAlexResults = await searchOpenAlex(question);
    for (const source of openAlexResults) {
      const key = source.title.toLowerCase().slice(0, 40);
      if (!seen.has(key)) { seen.add(key); deduped.push(source); }
    }
  }

  return deduped
    .sort((a, b) => {
      const order = { pubmed: 0, semantic: 1, eric: 2, openalex: 3 };
      if (a.openAccess !== b.openAccess) return a.openAccess ? -1 : 1;
      return order[a.source] - order[b.source];
    })
    .slice(0, 4);
}
