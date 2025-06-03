import * as BibTeXParser from "@retorquere/bibtex-parser";
import { type Entry as EntryDataBibLaTeX } from "@retorquere/bibtex-parser";
import moment from "moment";
// Also make EntryDataBibLaTeX available to other modules
export { type Entry as EntryDataBibLaTeX } from "@retorquere/bibtex-parser";

// Trick: allow string indexing onto object properties
export interface IIndexable {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

const fileTypes = ["csl-json", "biblatex"] as const;
export type LiteratureFileType = typeof fileTypes[number];

export const TEMPLATE_VARIABLES = {
  citekey: "Unique citekey",
  abstract: "",
  authorString: "Comma-separated list of author names",
  containerTitle:
    "Title of the container holding the reference (e.g. book title for a book chapter, or the journal title for a journal article)",
  DOI: "",
  eprint: "",
  eprinttype: "",
  eventPlace: "Location of event",
  note: "",
  page: "Page or page range",
  publisher: "",
  publisherPlace: "Location of publisher",
  title: "",
  titleShort: "",
  URL: "",
  year: "Publication year",
  files: "Pathes of attached files",
  zoteroSelectURI: "URI to open the reference in Zotero",
};

export class Library {
  constructor(public entries: { [citekey: string]: Entry }) { }

  get size(): number {
    return Object.keys(this.entries).length;
  }

  get entryList(): any[] {
    return Object.values(this.entries);
  }

  /**
   * For the given citekey, find the corresponding `Entry` and return a
   * collection of template variable assignments.
   */
  getTemplateVariablesForCitekey(citekey: string): Record<string, any> {
    const entry: Entry = this.entries[citekey];
    const shortcuts = {
      key: entry.key,
      citekey: citekey,

      abstract: entry.abstract,
      author: entry.author,
      authorString: entry.authorString,
      annotations: entry.annotations,
      annotationList: entry.annotationList,
      containerTitle: entry.containerTitle,
      containerTitleShort: entry.containerTitleShort,
      creators: entry.creators,
      DOI: entry.DOI,
      eprint: entry.eprint,
      eprinttype: entry.eprinttype,
      eventPlace: entry.eventPlace,
      files: entry.files,
      fileList: entry.fileList,
      firstCreator: entry.firstCreator,
      getNow: moment(),
      note: entry.note,
      page: entry.page,
      publisher: entry.publisher,
      publisherPlace: entry.publisherPlace,
      tags: entry.tags,
      title: entry.title,
      titleShort: entry.titleShort,
      type: entry.type,
      shortAuthor: entry.shortAuthor,
      URL: entry.URL,
      year: entry.year?.toString(),
      zoteroSelectURI: entry.zoteroSelectURI,
    };

    return { entry: entry.toJSON(), ...shortcuts };
  }
}

/**
 * Load reference entries from the given raw database data.
 *
 * Returns a list of `EntryData`, which should be wrapped with the relevant
 * adapter and used to instantiate a `Library`.
 */
export function loadEntries(
  databaseRaw: string,
  fileType: LiteratureFileType,
): EntryData[] {
  let libraryArray: EntryData[];

  if (fileType == "csl-json") {
    libraryArray = JSON.parse(databaseRaw);
  } else if (fileType == "biblatex") {
    const options: BibTeXParser.ParserOptions = {
      errorHandler: (err) => {
        console.warn(
          "Citation plugin: non-fatal error loading BibLaTeX entry:",
          err,
        );
      },
    };

    const parsed = BibTeXParser.parse(
      databaseRaw,
      options,
    ) as BibTeXParser.Bibliography;

    parsed.errors.forEach((error) => {
      console.error(
        "Citation plugin: fatal error loading BibLaTeX entry" +
        ` (line ${error.line}, column ${error.column}):`,
        error.message,
      );
    });

    libraryArray = parsed.entries;
  }

  return libraryArray!;
}

export interface Author {
  given?: string;
  family?: string;
}

export interface File {
  type: string;
  zoteroSelectURI?: string;
  zoteroOpenURI?: string;
  fileName: string;
  path: string;
}

export interface SingleNote {
  index: number,
  prefix: string,
  content: string
}

/**
 * An `Entry` represents a single reference in a reference database.
 * Each entry has a unique identifier, known in most reference managers as its
 * "citekey."
 */
export abstract class Entry {
  /**
   * Unique identifier for the entry (also the citekey).
   */
  public abstract id: string;

  public abstract type: string;

  public abstract abstract?: string;
  public abstract author?: Author[];
  public abstract creators?: any;
  public abstract firstCreator?: any;

  /**
   * A comma-separated list of authors, each of the format `<firstname> <lastname>`.
   */
  public abstract authorString?: string;
  public abstract shortAuthor?: string;

  /**
   * The name of the container for this reference -- in the case of a book
   * chapter reference, the name of the book; in the case of a journal article,
   * the name of the journal.
   */
  public abstract containerTitle?: string;
  public abstract containerTitleShort?: string;

  public abstract DOI?: string;
  public abstract files?: string[];
  public abstract fileList?: File[];

  /**
   * The date of issue. Many references do not contain information about month
   * and day of issue; in this case, the `issuedDate` will contain dummy minimum
   * values for those elements. (A reference which is only encoded as being
   * issued in 2001 is represented here with a date 2001-01-01 00:00:00 UTC.)
   */
  public abstract issuedDate?: Date;

  /**
   * Page or page range of the reference.
   */
  public abstract page?: string;
  public abstract tags?: string;
  public abstract title?: string;
  public abstract titleShort?: string;
  public abstract URL?: string;

  public abstract eventPlace?: string;

  public abstract publisher?: string;
  public abstract publisherPlace?: string;

  /**
   * BibLaTeX-specific properties
   */
  public abstract eprint?: string;
  public abstract eprinttype?: string;

  protected _year?: string;
  public get year(): number | undefined {
    return this._year
      ? parseInt(this._year)
      : this.issuedDate?.getFullYear();
  }

  protected _note?: string[];

  public get note(): SingleNote[] {
    return this._note
      ? this._note.map((el, index) => {
        return {
          index: index,
          prefix: "",
          content: el.replace(/\\herf\{(zotero:\/\/.+)\}/g, "[Link]($1)")
        };
      }) : [];
  }

  public get annotations() {
    return [] as any[];
  }

  public get annotationList() {
    return [] as any[];
  }

  public get key(): string {
    return "1_" + this.id;
  }

  /**
   * A URI which will open the relevant entry in the Zotero client.
   */
  public get zoteroSelectURI(): string {
    return `zotero://select/items/@${this.id}`;
  }

  toJSON(): Record<string, unknown> {
    const jsonObj: Record<string, unknown> = Object.assign({}, this as unknown);

    // add getter values
    const proto = Object.getPrototypeOf(this);
    Object.entries(Object.getOwnPropertyDescriptors(proto))
      .filter(([, descriptor]) => typeof descriptor.get == "function")
      .forEach(([key, descriptor]) => {
        if (descriptor && key[0] !== "_") {
          try {
            const val = (this as IIndexable)[key];
            jsonObj[key] = val;
          } catch (error) {
            return;
          }
        }
      });

    return jsonObj;
  }
}

export type EntryData = EntryDataCSL | EntryDataBibLaTeX;

export interface EntryDataCSL {
  id: string;
  type: string;

  abstract?: string;
  author?: Author[];
  "container-title"?: string;
  DOI?: string;
  "event-place"?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issued?: { "date-parts": [any[]] };
  page?: string;
  publisher?: string;
  "publisher-place"?: string;
  title?: string;
  "title-short"?: string;
  URL?: string;
}

export class EntryCSLAdapter extends Entry {
  shortAuthorLimit:number;
  constructor(private data: EntryDataCSL, shortAuthorLimit = 2) {
    super();
    this.shortAuthorLimit = shortAuthorLimit;
  }

  eprint: string | undefined = undefined;
  eprinttype: string | undefined = undefined;
  files: string[] | undefined = undefined;
  fileList?: File[] = [];

  get id() {
    return this.data.id;
  }

  get type() {
    return this.data.type;
  }

  get abstract() {
    return this.data.abstract;
  }
  get author() {
    return this.data.author;
  }

  get creators() {
    return this.data.author;
  }

  get firstCreator() {
    return this.data.author ? this.data.author[0] : null;
  }

  get authorString(): string | undefined {
    return this.data.author
      ? this.data.author.map((a) => `${a.given} ${a.family}`).join(", ")
      : undefined;
  }

  get shortAuthor(): string {
    const limit = this.shortAuthorLimit;
    let shortAuthor = "";
    if (!this.data.author) return "";
    const author = this.data.author;
    if (author.length == 0) {
      return "";
    }
    for (let i = 0; i < limit && i < author.length; i++) {
      const name = author[i].family;
      if (i == 0) {
        shortAuthor += name ?? "";
        if (limit < author.length) {
          shortAuthor +=  shortAuthor.length ? " et al." : "";
        }
      } else if (i == limit - 1) {
        shortAuthor += name ? " and " + name : "";
        if (limit < author.length) {
          shortAuthor +=  shortAuthor.length ? " et al." : "";
        }
      } else if (author.length < limit && i == author.length - 1) {
        shortAuthor += name ? " and " + name : "";
      } else {
        shortAuthor += name ? ", " + name : "";
      }
    }
    return shortAuthor;
  }

  get containerTitle() {
    return this.data["container-title"];
  }

  get containerTitleShort() {
    return this.data["container-title"];
  }

  get DOI() {
    return this.data.DOI;
  }

  get eventPlace() {
    return this.data["event-place"];
  }

  get issuedDate() {
    if (
      !(
        this.data.issued &&
        this.data.issued["date-parts"] &&
        this.data.issued["date-parts"][0].length > 0
      )
    )
      return undefined;

    const [year, month, day] = this.data.issued["date-parts"][0];
    return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  }

  get page() {
    return this.data.page;
  }

  get publisher() {
    return this.data.publisher;
  }

  get publisherPlace() {
    return this.data["publisher-place"];
  }

  get title() {
    return this.data.title;
  }

  get titleShort() {
    return this.data["title-short"];
  }

  get URL() {
    return this.data.URL;
  }

  get tags() {
    return "";
  }
}

const BIBLATEX_PROPERTY_MAPPING: Record<string, string> = {
  abstract: "abstract",
  booktitle: "_containerTitle",
  date: "issued",
  doi: "DOI",
  eprint: "eprint",
  eprinttype: "eprinttype",
  eventtitle: "event",
  journal: "_containerTitle",
  journaltitle: "_containerTitle",
  location: "publisherPlace",
  pages: "page",
  shortjournal: "containerTitleShort",
  title: "title",
  shorttitle: "titleShort",
  url: "URL",
  venue: "eventPlace",
  year: "_year",
  publisher: "publisher",
  note: "_note",
};

// BibLaTeX parser returns arrays of property values (allowing for repeated
// property entries). For the following fields, just blindly take the first.
const BIBLATEX_PROPERTY_TAKE_FIRST: string[] = [
  "abstract",
  "booktitle",
  "_containerTitle",
  "date",
  "doi",
  "eprint",
  "eprinttype",
  "eventtitle",
  "journaltitle",
  "location",
  "pages",
  "shortjournal",
  "title",
  "shorttitle",
  "url",
  "venue",
  "_year",
  "publisher",
];

export class EntryBibLaTeXAdapter extends Entry {
  abstract?: string;
  _containerTitle?: string;
  containerTitleShort?: string;
  DOI?: string;
  eprint?: string;
  eprinttype?: string;
  event?: string;
  eventPlace?: string;
  issued?: string;
  page?: string;
  publisher?: string;
  publisherPlace?: string;
  title?: string;
  titleShort?: string;
  URL?: string;
  shortAuthorLimit: number;
  declare _year?: string;
  declare _note?: string[];

  constructor(private data: EntryDataBibLaTeX, shortAuthorLimit = 2) {
    super();
    this.shortAuthorLimit = shortAuthorLimit;
    Object.entries(BIBLATEX_PROPERTY_MAPPING).forEach(
      (map: [string, string]) => {
        const [src, tgt] = map;
        if (src in this.data.fields) {
          let val = this.data.fields[src];
          if (BIBLATEX_PROPERTY_TAKE_FIRST.includes(src)) {
            val = (val as any[])[0];
          }

          (this as IIndexable)[tgt] = val;
        }
      },
    );
  }

  get id() {
    return this.data.key;
  }

  get type() {
    return this.data.type;
  }

  get files(): string[] {
    // For some reason the bibtex parser doesn"t reliably parse file list to
    // array ; so we"ll do it manually / redundantly
    let ret: string[] = [];
    if (this.data.fields.file) {
      ret = ret.concat(this.data.fields.file.flatMap((x) => x.split(";")));
    }
    if (this.data.fields.files) {
      ret = ret.concat(this.data.fields.files.flatMap((x) => x.split(";")));
    }

    return ret;
  }

  get fileList(): File[] {
    let ret: string[] = [];
    if (this.data.fields.file) {
      ret = ret.concat(this.data.fields.file.flatMap((x) => x.split(";")));
    }
    if (this.data.fields.files) {
      ret = ret.concat(this.data.fields.files.flatMap((x) => x.split(";")));
    }

    return ret.map(path => {
      const fileName =  path.split("\\").slice(-1)[0];
      return {
        fileName,
        type: path.split(".").slice(-1)[0],
        path: "file://" + path.replace(/\\(.?)/g, (m, p1) => p1)
      } as File;
    });
  }

  get authorString() {
    if (this.data.creators.author) {
      const names = this.data.creators.author.map((name) => {
        if (name.literal) return name.literal;
        const parts = [name.firstName, name.prefix, name.lastName, name.suffix];
        // Drop any null parts and join
        return parts.filter((x) => x).join(" ");
      });
      return names.join(", ");
    } else if (this.data.fields.author) {
      return this.data.fields.author.join(", ");
    } else {
      return "";
    }
  }

  get shortAuthor(): string {
    const limit = this.shortAuthorLimit;
    let shortAuthor = "";
    const author = this.data.creators.author;
    if (!author || author.length == 0) {
      return "";
    }
    for (let i = 0; i < limit && i < author.length; i++) {
      let name = "";
      if (author[i].literal) name = author[i].literal!;
      else name = author[i].lastName!;
      
      if (i == 0) {
        shortAuthor += name ?? "";
        if (limit < author.length) {
          shortAuthor +=  shortAuthor.length ? " et al." : "";
        }
      } else if (i == limit - 1) {
        shortAuthor += name ? " and " + name : "";
        if (limit < author.length) {
          shortAuthor +=  shortAuthor.length ? " et al." : "";
        }
      } else if (author.length < limit && i == author.length - 1) {
        shortAuthor += name ? " and " + name : "";
      } else {
        shortAuthor += name ? ", " + name : "";
      }
    }
    return shortAuthor;
  }

  get containerTitle() {
    if (this._containerTitle) {
      return this._containerTitle;
    } else if (this.data.fields.eprint) {
      const prefix = this.data.fields.eprinttype
        ? `${this.data.fields.eprinttype}:`
        : "";
      const suffix = this.data.fields.primaryclass
        ? ` [${this.data.fields.primaryclass}]`
        : "";
      return `${prefix}${this.data.fields.eprint}${suffix}`;
    } else {
      return "";
    }
  }

  get issuedDate() {
    return this.issued ? new Date(this.issued) : undefined;
  }

  get author(): Author[] {
    return this.data.creators.author?.map((a) => ({
      given: a.firstName,
      family: a.lastName,
    }));
  }

  get creators() {
    return this.data.creators;
  }

  get firstCreator() {
    return this.data.creators[0];
  }

  get tags(): string {
    if (this.data.fields.keywords) {
      return this.data.fields.keywords?.join(", ");
    } else {
      return "";
    }
  }
}
