/**
 * data.js — Static biblical reference data.
 *
 * This is the ONLY file that should contain raw biblical facts. Every other
 * module (questions.js, narrative.js, etc.) reads from these tables rather
 * than hardcoding trivia inline. That keeps the data auditable in one place
 * and makes it easy to correct or extend later.
 *
 * All entries are tagged with `era` (1-7) matching ERA_NAMES below, so the
 * question engine can filter by the player's current chapter of the story.
 *
 * Verse fragments are short, well-known King James Version phrasings.
 * The KJV text itself is in the public domain, and fragments here are kept
 * intentionally brief (well under a full verse) for quick-read gameplay.
 */

const ERA_NAMES = [
  "Era 1: The Patriarchs",
  "Era 2: Exodus & Law",
  "Era 3: The Kingdom",
  "Era 4: Prophets & Exile",
  "Era 5: The Gospels",
  "Era 6: Acts & Epistles",
  "Era 7: Revelation"
];

const ERA_THEMES = [
  { sky: ['#2c1e16', '#4a3520'], mid: 'tent',    near: 'rock'   },
  { sky: ['#3a2e1e', '#6b5230'], mid: 'pyramid', near: 'palm'   },
  { sky: ['#2e2e36', '#4a4a5a'], mid: 'tower',   near: 'pillar' },
  { sky: ['#1a1a22', '#33333d'], mid: 'ruin',    near: 'cloud'  },
  { sky: ['#2b2e1e', '#4a5030'], mid: 'tree',    near: 'stone'  },
  { sky: ['#1e2a33', '#304550'], mid: 'sail',    near: 'wave'   },
  { sky: ['#1c1c2e', '#2e2e55'], mid: 'ring',    near: 'spire'  }
];

/**
 * Per-era atmosphere / weather particle config, used by game.js to give each
 * era a distinct ambient "feel" beyond just the sky gradient and silhouettes.
 *   type   - label only (for readability / future branching)
 *   color  - "r,g,b" string, alpha applied separately at draw time
 *   density- number of particles maintained on screen
 *   speedMin/speedMax - per-particle drift speed range
 *   sizeMin/sizeMax   - per-particle radius range (px)
 *   drift  - 'up' | 'down' | 'side' | 'twinkle' movement pattern
 */
const ERA_ATMOSPHERE = [
  { type: 'dust',   color: '214,178,120', density: 14, speedMin: 0.15, speedMax: 0.40, sizeMin: 1.5, sizeMax: 3.5, drift: 'up'       }, // Patriarchs: warm desert dust drifting upward in the dusk heat
  { type: 'sand',   color: '224,186,110', density: 24, speedMin: 0.60, speedMax: 1.40, sizeMin: 1.0, sizeMax: 2.5, drift: 'side'     }, // Exodus & Law: windswept sand streaking sideways across the wilderness
  { type: 'ember',  color: '255,180,90',  density: 10, speedMin: 0.30, speedMax: 0.70, sizeMin: 1.5, sizeMax: 3.0, drift: 'up'       }, // Kingdom: torchlight embers rising over the city at dusk
  { type: 'ash',    color: '180,170,170', density: 16, speedMin: 0.40, speedMax: 0.90, sizeMin: 1.5, sizeMax: 3.5, drift: 'down'     }, // Prophets & Exile: grey ash falling over a fractured, exiled kingdom
  { type: 'pollen', color: '255,240,180', density: 12, speedMin: 0.10, speedMax: 0.30, sizeMin: 1.5, sizeMax: 3.0, drift: 'up'       }, // Gospels: soft golden light-motes drifting through green hillsides
  { type: 'mist',   color: '210,230,240', density: 10, speedMin: 0.20, speedMax: 0.50, sizeMin: 3.0, sizeMax: 6.0, drift: 'side'     }, // Acts & Epistles: sea mist drifting over Mediterranean harbor towns
  { type: 'stars',  color: '230,220,255', density: 22, speedMin: 0.05, speedMax: 0.15, sizeMin: 1.0, sizeMax: 2.5, drift: 'twinkle'  }  // Revelation: a cosmic field of slowly twinkling stars
];

/** All 66 books in canonical order, tagged with testament/era. */
/** Testament + generic book-range reference per era, used as metadata fallback
 *  when a specific fact doesn't carry its own book/reference. */
const ERA_TESTAMENT = ['Old','Old','Old','Old','New','New','New'];
const ERA_BOOK_FALLBACK = ['Genesis','Exodus–Deuteronomy','Joshua–2 Chronicles','Isaiah–Malachi','The Gospels','Acts–Jude','Revelation'];

/** Lightweight keyword → tag inference, used to auto-tag generated questions
 *  (Faith, Prayer, Miracles, Prophets, Kings, Disciples, Salvation, Love, Wisdom)
 *  without hand-tagging every individual fact in the data tables below. */
const TAG_RULES = [
  { re:/faith|believ|trust/i, tag:'Faith' },
  { re:/pray/i, tag:'Prayer' },
  { re:/miracle|heal|raised?|walk(ed|ing)? on|feed|feeding|turn(ed|ing)?.*wine|multipl|calm(ed|ing)? a? ?storm/i, tag:'Miracles' },
  { re:/prophet|prophes/i, tag:'Prophets' },
  { re:/king|kingdom|throne|reign/i, tag:'Kings' },
  { re:/disciple|apostle|follow(er|ed)?/i, tag:'Disciples' },
  { re:/salvation|saved|redee|sin|forgive|resurrec|crucifi/i, tag:'Salvation' },
  { re:/love|mercy|compassion|grace/i, tag:'Love' },
  { re:/wisdom|wise|parable|lesson/i, tag:'Wisdom' }
];
function inferTags(text) {
  const tags = TAG_RULES.filter(r => r.re.test(text)).map(r => r.tag);
  return tags.length ? [...new Set(tags)] : ['Bible Knowledge'];
}

const BIBLE_BOOKS = [
  { name:"Genesis",testament:"Old",era:1,order:1 },{ name:"Exodus",testament:"Old",era:2,order:2 },
  { name:"Leviticus",testament:"Old",era:2,order:3 },{ name:"Numbers",testament:"Old",era:2,order:4 },
  { name:"Deuteronomy",testament:"Old",era:2,order:5 },{ name:"Joshua",testament:"Old",era:3,order:6 },
  { name:"Judges",testament:"Old",era:3,order:7 },{ name:"Ruth",testament:"Old",era:3,order:8 },
  { name:"1 Samuel",testament:"Old",era:3,order:9 },{ name:"2 Samuel",testament:"Old",era:3,order:10 },
  { name:"1 Kings",testament:"Old",era:3,order:11 },{ name:"2 Kings",testament:"Old",era:3,order:12 },
  { name:"1 Chronicles",testament:"Old",era:3,order:13 },{ name:"2 Chronicles",testament:"Old",era:3,order:14 },
  { name:"Ezra",testament:"Old",era:3,order:15 },{ name:"Nehemiah",testament:"Old",era:3,order:16 },
  { name:"Esther",testament:"Old",era:3,order:17 },{ name:"Job",testament:"Old",era:3,order:18 },
  { name:"Psalms",testament:"Old",era:3,order:19 },{ name:"Proverbs",testament:"Old",era:3,order:20 },
  { name:"Ecclesiastes",testament:"Old",era:3,order:21 },{ name:"Song of Solomon",testament:"Old",era:3,order:22 },
  { name:"Isaiah",testament:"Old",era:4,order:23 },{ name:"Jeremiah",testament:"Old",era:4,order:24 },
  { name:"Lamentations",testament:"Old",era:4,order:25 },{ name:"Ezekiel",testament:"Old",era:4,order:26 },
  { name:"Daniel",testament:"Old",era:4,order:27 },{ name:"Hosea",testament:"Old",era:4,order:28 },
  { name:"Joel",testament:"Old",era:4,order:29 },{ name:"Amos",testament:"Old",era:4,order:30 },
  { name:"Obadiah",testament:"Old",era:4,order:31 },{ name:"Jonah",testament:"Old",era:4,order:32 },
  { name:"Micah",testament:"Old",era:4,order:33 },{ name:"Nahum",testament:"Old",era:4,order:34 },
  { name:"Habakkuk",testament:"Old",era:4,order:35 },{ name:"Zephaniah",testament:"Old",era:4,order:36 },
  { name:"Haggai",testament:"Old",era:4,order:37 },{ name:"Zechariah",testament:"Old",era:4,order:38 },
  { name:"Malachi",testament:"Old",era:4,order:39 },{ name:"Matthew",testament:"New",era:5,order:40 },
  { name:"Mark",testament:"New",era:5,order:41 },{ name:"Luke",testament:"New",era:5,order:42 },
  { name:"John",testament:"New",era:5,order:43 },{ name:"Acts",testament:"New",era:6,order:44 },
  { name:"Romans",testament:"New",era:6,order:45 },{ name:"1 Corinthians",testament:"New",era:6,order:46 },
  { name:"2 Corinthians",testament:"New",era:6,order:47 },{ name:"Galatians",testament:"New",era:6,order:48 },
  { name:"Ephesians",testament:"New",era:6,order:49 },{ name:"Philippians",testament:"New",era:6,order:50 },
  { name:"Colossians",testament:"New",era:6,order:51 },{ name:"1 Thessalonians",testament:"New",era:6,order:52 },
  { name:"2 Thessalonians",testament:"New",era:6,order:53 },{ name:"1 Timothy",testament:"New",era:6,order:54 },
  { name:"2 Timothy",testament:"New",era:6,order:55 },{ name:"Titus",testament:"New",era:6,order:56 },
  { name:"Philemon",testament:"New",era:6,order:57 },{ name:"Hebrews",testament:"New",era:6,order:58 },
  { name:"James",testament:"New",era:6,order:59 },{ name:"1 Peter",testament:"New",era:6,order:60 },
  { name:"2 Peter",testament:"New",era:6,order:61 },{ name:"1 John",testament:"New",era:6,order:62 },
  { name:"2 John",testament:"New",era:6,order:63 },{ name:"3 John",testament:"New",era:6,order:64 },
  { name:"Jude",testament:"New",era:6,order:65 },{ name:"Revelation",testament:"New",era:7,order:66 }
];

/** Relationship pairs — used for "X was the ___ of whom?" style questions. */
const RELATIONSHIPS = [
  { subject:"Isaac", relation:"son", object:"Abraham", era:1, ref:"Genesis 21:1-3"},
  { subject:"Jacob", relation:"son", object:"Isaac", era:1, ref:"Genesis 25:24-26"},
  { subject:"Esau", relation:"twin brother", object:"Jacob", era:1, ref:"Genesis 25:24-26"},
  { subject:"Joseph", relation:"son", object:"Jacob", era:1, ref:"Genesis 30:22-24"},
  { subject:"Benjamin", relation:"youngest son", object:"Jacob", era:1, ref:"Genesis 35:16-18"},
  { subject:"Sarah", relation:"wife", object:"Abraham", era:1, ref:"Genesis 17:15-16"},
  { subject:"Rebekah", relation:"wife", object:"Isaac", era:1, ref:"Genesis 24:67"},
  { subject:"Rachel", relation:"favored wife", object:"Jacob", era:1, ref:"Genesis 29:28-30"},
  { subject:"Lot", relation:"nephew", object:"Abraham", era:1, ref:"Genesis 12:5"},
  { subject:"Ishmael", relation:"son", object:"Abraham", era:1, ref:"Genesis 16:15"},
  { subject:"Terah", relation:"father", object:"Abraham", era:1, ref:"Genesis 11:26-27"},
  { subject:"Nahor", relation:"brother", object:"Abraham", era:1, ref:"Genesis 11:27"},
  { subject:"Laban", relation:"father-in-law", object:"Jacob", era:1, ref:"Genesis 29:16-19"},
  { subject:"Leah", relation:"first wife", object:"Jacob", era:1, ref:"Genesis 29:23-25"},
  { subject:"Reuben", relation:"firstborn son", object:"Jacob", era:1, ref:"Genesis 29:32"},
  { subject:"Judah", relation:"son", object:"Jacob", era:1, ref:"Genesis 29:35"},
  { subject:"Levi", relation:"son", object:"Jacob", era:1, ref:"Genesis 29:34"},
  { subject:"Dinah", relation:"daughter", object:"Jacob", era:1, ref:"Genesis 30:21"},
  { subject:"Ephraim", relation:"son", object:"Joseph", era:1, ref:"Genesis 41:52"},
  { subject:"Manasseh", relation:"son", object:"Joseph", era:1, ref:"Genesis 41:51"},
  { subject:"Keturah", relation:"wife after Sarah's death", object:"Abraham", era:1, ref:"Genesis 25:1"},
  { subject:"Bethuel", relation:"father", object:"Rebekah", era:1, ref:"Genesis 24:15"},
  { subject:"Potiphar", relation:"Egyptian master", object:"Joseph", era:1, ref:"Genesis 39:1"},
  { subject:"Aaron", relation:"brother", object:"Moses", era:2, ref:"Exodus 4:14"},
  { subject:"Zipporah", relation:"wife", object:"Moses", era:2, ref:"Exodus 2:21"},
  { subject:"Nadab and Abihu", relation:"sons", object:"Aaron", era:2, ref:"Exodus 6:23"},
  { subject:"Miriam", relation:"sister", object:"Moses", era:2, ref:"Exodus 15:20"},
  { subject:"Joshua", relation:"successor", object:"Moses", era:2, ref:"Deuteronomy 34:9"},
  { subject:"Eleazar", relation:"son", object:"Aaron", era:2, ref:"Exodus 6:23"},
  { subject:"Jethro", relation:"father-in-law", object:"Moses", era:2, ref:"Exodus 3:1"},
  { subject:"Caleb", relation:"fellow faithful spy alongside", object:"Joshua", era:2, ref:"Numbers 14:6-9"},
  { subject:"Jonathan", relation:"loyal friend", object:"David", era:3, ref:"1 Samuel 18:1-3"},
  { subject:"Solomon", relation:"son", object:"David", era:3, ref:"2 Samuel 12:24"},
  { subject:"Absalom", relation:"rebellious son", object:"David", era:3, ref:"2 Samuel 15:10-14"},
  { subject:"Bathsheba", relation:"wife", object:"David", era:3, ref:"2 Samuel 11:27"},
  { subject:"Michal", relation:"first wife", object:"David", era:3, ref:"1 Samuel 18:27"},
  { subject:"Rehoboam", relation:"son and successor", object:"Solomon", era:3, ref:"1 Kings 11:43"},
  { subject:"Joash", relation:"son", object:"Ahaziah", era:3, ref:"2 Kings 11:1-2"},
  { subject:"Naomi", relation:"mother-in-law", object:"Ruth", era:3, ref:"Ruth 1:14"},
  { subject:"Boaz", relation:"kinsman-redeemer", object:"Ruth", era:3, ref:"Ruth 4:13"},
  { subject:"Abigail", relation:"wife", object:"David", era:3, ref:"1 Samuel 25:39-42"},
  { subject:"Nabal", relation:"foolish husband", object:"Abigail", era:3, ref:"1 Samuel 25:2-3"},
  { subject:"Jesse", relation:"father", object:"David", era:3, ref:"1 Samuel 16:1"},
  { subject:"Elisha", relation:"successor", object:"Elijah", era:4, ref:"1 Kings 19:19-21"},
  { subject:"Baruch", relation:"scribe", object:"Jeremiah", era:4, ref:"Jeremiah 36:4"},
  { subject:"Gehazi", relation:"servant", object:"Elisha", era:4, ref:"2 Kings 4:12"},
  { subject:"Shadrach, Meshach, and Abednego", relation:"faithful companions", object:"Daniel", era:4, ref:"Daniel 1:6-7"},
  { subject:"Jezebel", relation:"wife", object:"Ahab", era:4, ref:"1 Kings 16:31"},
  { subject:"Mordecai", relation:"cousin and guardian", object:"Esther", era:3, ref:"Esther 2:7"},
  { subject:"John the Baptist", relation:"forerunner", object:"Jesus", era:5, ref:"Luke 1:76"},
  { subject:"Elizabeth", relation:"mother", object:"John the Baptist", era:5, ref:"Luke 1:57"},
  { subject:"Mary", relation:"mother", object:"Jesus", era:5, ref:"Luke 1:31"},
  { subject:"Joseph", relation:"earthly father", object:"Jesus", era:5, ref:"Matthew 1:24-25"},
  { subject:"Peter", relation:"leading disciple", object:"Jesus", era:5, ref:"Matthew 4:18-19"},
  { subject:"Andrew", relation:"brother", object:"Peter", era:5, ref:"John 1:40"},
  { subject:"James", relation:"brother", object:"John", era:5, ref:"Matthew 4:21"},
  { subject:"Martha", relation:"sister", object:"Mary of Bethany", era:5, ref:"John 11:1"},
  { subject:"Lazarus", relation:"brother", object:"Mary of Bethany", era:5, ref:"John 11:1-2"},
  { subject:"Judas Iscariot", relation:"betrayer", object:"Jesus", era:5, ref:"Matthew 26:14-16"},
  { subject:"Nicodemus", relation:"nighttime visitor", object:"Jesus", era:5, ref:"John 3:1-2"},
  { subject:"Mary Magdalene", relation:"first witness to the resurrection", object:"Jesus", era:5, ref:"John 20:11-18"},
  { subject:"Simon of Cyrene", relation:"man who carried the cross", object:"Jesus", era:5, ref:"Mark 15:21"},
  { subject:"Joseph of Arimathea", relation:"man who donated his tomb", object:"Jesus", era:5, ref:"Matthew 27:57-60"},
  { subject:"Timothy", relation:"disciple", object:"Paul", era:6, ref:"Acts 16:1-3"},
  { subject:"Titus", relation:"companion", object:"Paul", era:6, ref:"2 Corinthians 8:23"},
  { subject:"Silas", relation:"companion", object:"Paul", era:6, ref:"Acts 15:40"},
  { subject:"Barnabas", relation:"missionary partner", object:"Paul", era:6, ref:"Acts 13:2-3"},
  { subject:"Luke", relation:"physician and traveling companion", object:"Paul", era:6, ref:"Colossians 4:14"},
  { subject:"Priscilla and Aquila", relation:"tentmaking friends", object:"Paul", era:6, ref:"Acts 18:2-3"},
  { subject:"John Mark", relation:"cousin", object:"Barnabas", era:6, ref:"Colossians 4:10"},
  { subject:"Cornelius", relation:"Roman centurion convert", object:"Peter", era:6, ref:"Acts 10:1-2"},
  { subject:"Apollos", relation:"student", object:"Priscilla and Aquila", era:6, ref:"Acts 18:24-26"}
];

/** Kings of the united and divided kingdoms. */
const KINGS = [
  { name:"Saul", kingdom:"United Kingdom", order:1, era:3, goodKing:false, ref:"1 Samuel 10:1" },
  { name:"David", kingdom:"United Kingdom", order:2, era:3, goodKing:true, ref:"2 Samuel 5:3-4" },
  { name:"Solomon", kingdom:"United Kingdom", order:3, era:3, goodKing:true, ref:"1 Kings 1:39" },
  { name:"Rehoboam", kingdom:"Judah", order:1, era:3, goodKing:false, ref:"1 Kings 12:1" },
  { name:"Abijah", kingdom:"Judah", order:2, era:3, goodKing:null, ref:"1 Kings 15:1-2" },
  { name:"Asa", kingdom:"Judah", order:3, era:3, goodKing:true, ref:"1 Kings 15:9-11" },
  { name:"Jehoshaphat", kingdom:"Judah", order:4, era:3, goodKing:true, ref:"1 Kings 22:41-43" },
  { name:"Jehoram", kingdom:"Judah", order:5, era:4, goodKing:false, ref:"2 Kings 8:16-18" },
  { name:"Ahaziah of Judah", kingdom:"Judah", order:6, era:4, goodKing:false, ref:"2 Kings 8:25-27" },
  { name:"Joash of Judah", kingdom:"Judah", order:7, era:4, goodKing:true, ref:"2 Kings 12:1-2" },
  { name:"Amaziah", kingdom:"Judah", order:8, era:4, goodKing:null, ref:"2 Kings 14:1-3" },
  { name:"Uzziah", kingdom:"Judah", order:9, era:4, goodKing:true, ref:"2 Kings 15:1-3" },
  { name:"Jotham", kingdom:"Judah", order:10, era:4, goodKing:true, ref:"2 Kings 15:32-34" },
  { name:"Ahaz", kingdom:"Judah", order:11, era:4, goodKing:false, ref:"2 Kings 16:1-2" },
  { name:"Hezekiah", kingdom:"Judah", order:12, era:4, goodKing:true, ref:"2 Kings 18:1-3" },
  { name:"Manasseh", kingdom:"Judah", order:13, era:4, goodKing:false, ref:"2 Kings 21:1-2" },
  { name:"Josiah", kingdom:"Judah", order:14, era:4, goodKing:true, ref:"2 Kings 22:1-2" },
  { name:"Jehoiakim", kingdom:"Judah", order:15, era:4, goodKing:false, ref:"2 Kings 23:34-37" },
  { name:"Zedekiah", kingdom:"Judah", order:16, era:4, goodKing:false, ref:"2 Kings 24:17-19" },
  { name:"Jeroboam I", kingdom:"Israel", order:1, era:3, goodKing:false, ref:"1 Kings 12:20" },
  { name:"Nadab", kingdom:"Israel", order:2, era:3, goodKing:false, ref:"1 Kings 15:25" },
  { name:"Baasha", kingdom:"Israel", order:3, era:3, goodKing:false, ref:"1 Kings 15:27-28" },
  { name:"Omri", kingdom:"Israel", order:4, era:4, goodKing:false, ref:"1 Kings 16:16-17" },
  { name:"Ahab", kingdom:"Israel", order:5, era:4, goodKing:false, ref:"1 Kings 16:29-30" },
  { name:"Jehu", kingdom:"Israel", order:6, era:4, goodKing:null, ref:"2 Kings 9:1-3" },
  { name:"Jeroboam II", kingdom:"Israel", order:7, era:4, goodKing:false, ref:"2 Kings 14:23" },
  { name:"Hoshea", kingdom:"Israel", order:8, era:4, goodKing:false, ref:"2 Kings 17:1" }
];

/** Prophets across both testaments. */
const PROPHETS = [
  { name:"Samuel", era:3, type:"non-writing", note:"anointed both Saul and David as king", ref:"1 Samuel 16:13" },
  { name:"Nathan", era:3, type:"non-writing", note:"confronted David after his sin with Bathsheba", ref:"2 Samuel 12:1-7" },
  { name:"Elijah", era:4, type:"non-writing", note:"challenged the prophets of Baal on Mount Carmel", ref:"1 Kings 18:36-38" },
  { name:"Elisha", era:4, type:"non-writing", note:"received a double portion of Elijah's spirit", ref:"2 Kings 2:9-15" },
  { name:"Isaiah", era:4, type:"major", note:"prophesied the coming of a child called Immanuel", ref:"Isaiah 7:14" },
  { name:"Jeremiah", era:4, type:"major", note:"known as 'the weeping prophet'", ref:"Jeremiah 9:1" },
  { name:"Ezekiel", era:4, type:"major", note:"saw a vision of a valley of dry bones", ref:"Ezekiel 37:1-14" },
  { name:"Daniel", era:4, type:"major", note:"survived a night in a den of lions", ref:"Daniel 6:16-23" },
  { name:"Hosea", era:4, type:"minor", note:"married an unfaithful woman as a living parable", ref:"Hosea 1:2-3" },
  { name:"Joel", era:4, type:"minor", note:"prophesied the outpouring of God's Spirit on all people", ref:"Joel 2:28" },
  { name:"Amos", era:4, type:"minor", note:"was a shepherd who preached against social injustice", ref:"Amos 5:24" },
  { name:"Obadiah", era:4, type:"minor", note:"wrote the shortest book in the Old Testament", ref:"Obadiah 1:1" },
  { name:"Jonah", era:4, type:"minor", note:"was swallowed by a great fish before reaching Nineveh", ref:"Jonah 1:17" },
  { name:"Micah", era:4, type:"minor", note:"foretold that the Messiah would be born in Bethlehem", ref:"Micah 5:2" },
  { name:"Nahum", era:4, type:"minor", note:"prophesied the fall of Nineveh", ref:"Nahum 1:1" },
  { name:"Habakkuk", era:4, type:"minor", note:"questioned God about the presence of injustice", ref:"Habakkuk 1:2-3" },
  { name:"Zephaniah", era:4, type:"minor", note:"warned of the coming 'day of the Lord'", ref:"Zephaniah 1:14-15" },
  { name:"Haggai", era:4, type:"minor", note:"urged the exiles to rebuild the temple", ref:"Haggai 1:2-4" },
  { name:"Zechariah", era:4, type:"minor", note:"saw a series of visions about Jerusalem's future", ref:"Zechariah 1:1" },
  { name:"Malachi", era:4, type:"minor", note:"is the final book of the Old Testament", ref:"Malachi 4:5-6" },
  { name:"John the Baptist", era:5, type:"non-writing", note:"prepared the way for Jesus in the wilderness", ref:"Matthew 3:1-3" },
  { name:"Agabus", era:6, type:"non-writing", note:"predicted a famine and Paul's arrest in Jerusalem", ref:"Acts 11:27-28" }
];

/** Miracles — descriptor, performer, and source book. */
const MIRACLES = [
  { desc:"Providing a ram to spare Isaac from sacrifice on Mount Moriah", performer:"God", era:1, book:"Genesis", ref:"Genesis 22:11-13" },
  { desc:"Enabling Sarah to conceive a son in her old age", performer:"God", era:1, book:"Genesis", ref:"Genesis 21:1-2" },
  { desc:"Confusing human language at the Tower of Babel", performer:"God", era:1, book:"Genesis", ref:"Genesis 11:7-9" },
  { desc:"Warning Lot's family to flee before Sodom's destruction", performer:"Angels", era:1, book:"Genesis", ref:"Genesis 19:15-16" },
  { desc:"Turning Lot's wife into a pillar of salt", performer:"God", era:1, book:"Genesis", ref:"Genesis 19:26" },
  { desc:"Wrestling with Jacob until daybreak at Peniel", performer:"The Angel of the Lord", era:1, book:"Genesis", ref:"Genesis 32:24-30" },
  { desc:"Interpreting Pharaoh's dreams of seven years of plenty and famine", performer:"Joseph", era:1, book:"Genesis", ref:"Genesis 41:25-32" },
  { desc:"Interpreting the dreams of Pharaoh's cupbearer and baker in prison", performer:"Joseph", era:1, book:"Genesis", ref:"Genesis 40:5-19" },
  { desc:"Parting the Red Sea", performer:"Moses", era:2, book:"Exodus", ref:"Exodus 14:21-22" },
  { desc:"Bringing water from a rock at Horeb", performer:"Moses", era:2, book:"Exodus", ref:"Exodus 17:5-6" },
  { desc:"Manna appearing each morning in the wilderness", performer:"God, through Moses", era:2, book:"Exodus", ref:"Exodus 16:14-15" },
  { desc:"Turning the Nile River to blood", performer:"Moses and Aaron", era:2, book:"Exodus", ref:"Exodus 7:20-21" },
  { desc:"Sending a plague of locusts across Egypt", performer:"Moses", era:2, book:"Exodus", ref:"Exodus 10:12-15" },
  { desc:"The Passover: death passing over homes marked with lamb's blood", performer:"God", era:2, book:"Exodus", ref:"Exodus 12:12-13" },
  { desc:"A donkey speaking aloud to rebuke the prophet Balaam", performer:"God", era:2, book:"Numbers", ref:"Numbers 22:28" },
  { desc:"The ground opening to swallow Korah's rebellion", performer:"God", era:2, book:"Numbers", ref:"Numbers 16:31-33" },
  { desc:"A bronze serpent healing those who looked upon it", performer:"Moses", era:2, book:"Numbers", ref:"Numbers 21:8-9" },
  { desc:"The sun standing still over Gibeon", performer:"Joshua", era:3, book:"Joshua", ref:"Joshua 10:12-13" },
  { desc:"The walls of Jericho collapsing", performer:"Joshua", era:3, book:"Joshua", ref:"Joshua 6:20" },
  { desc:"Defeating the giant Goliath with a sling and a single stone", performer:"David", era:3, book:"1 Samuel", ref:"1 Samuel 17:49-50" },
  { desc:"Playing the harp to soothe King Saul's troubled spirit", performer:"David", era:3, book:"1 Samuel", ref:"1 Samuel 16:23" },
  { desc:"Losing his great strength after Delilah cut his hair", performer:"Samson", era:3, book:"Judges", ref:"Judges 16:19" },
  { desc:"Pushing down the pillars of a Philistine temple in a final act of strength", performer:"Samson", era:3, book:"Judges", ref:"Judges 16:29-30" },
  { desc:"Judging a dispute between two women by proposing to divide a living baby", performer:"Solomon", era:3, book:"1 Kings", ref:"1 Kings 3:24-27" },
  { desc:"Testing Solomon's wisdom with hard questions", performer:"The Queen of Sheba", era:3, book:"1 Kings", ref:"1 Kings 10:1-3" },
  { desc:"Fire from heaven consuming a water-soaked altar", performer:"Elijah", era:4, book:"1 Kings", ref:"1 Kings 18:37-38" },
  { desc:"Being fed by ravens beside the brook Cherith", performer:"Elijah", era:4, book:"1 Kings", ref:"1 Kings 17:4-6" },
  { desc:"Raising the widow's son at Zarephath", performer:"Elijah", era:4, book:"1 Kings", ref:"1 Kings 17:21-22" },
  { desc:"Multiplying a widow's flour and oil during a famine at Zarephath", performer:"Elijah", era:4, book:"1 Kings", ref:"1 Kings 17:14-16" },
  { desc:"Ascending to heaven in a chariot of fire", performer:"Elijah", era:4, book:"2 Kings", ref:"2 Kings 2:11" },
  { desc:"Multiplying a widow's jar of oil", performer:"Elisha", era:4, book:"2 Kings", ref:"2 Kings 4:3-6" },
  { desc:"Raising the Shunammite woman's son", performer:"Elisha", era:4, book:"2 Kings", ref:"2 Kings 4:32-35" },
  { desc:"Healing Naaman's leprosy in the Jordan", performer:"Elisha", era:4, book:"2 Kings", ref:"2 Kings 5:14" },
  { desc:"Surviving unharmed in a den of lions", performer:"Daniel", era:4, book:"Daniel", ref:"Daniel 6:22" },
  { desc:"Walking unburned through a fiery furnace", performer:"Shadrach, Meshach, and Abednego", era:4, book:"Daniel", ref:"Daniel 3:24-25" },
  { desc:"Interpreting mysterious handwriting on a palace wall", performer:"Daniel", era:4, book:"Daniel", ref:"Daniel 5:25-28" },
  { desc:"Being swallowed by a great fish and surviving three days", performer:"Jonah", era:4, book:"Jonah", ref:"Jonah 1:17" },
  { desc:"Turning water into wine at a wedding in Cana", performer:"Jesus", era:5, book:"John", ref:"John 2:7-9" },
  { desc:"Feeding five thousand with five loaves and two fish", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 14:19-21" },
  { desc:"Walking on the surface of the Sea of Galilee", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 14:25-26" },
  { desc:"Calming a storm with a word", performer:"Jesus", era:5, book:"Mark", ref:"Mark 4:39" },
  { desc:"Raising Lazarus after four days in the tomb", performer:"Jesus", era:5, book:"John", ref:"John 11:43-44" },
  { desc:"Healing a man who had been blind from birth", performer:"Jesus", era:5, book:"John", ref:"John 9:6-7" },
  { desc:"Cleansing ten men of leprosy", performer:"Jesus", era:5, book:"Luke", ref:"Luke 17:14" },
  { desc:"Healing a paralyzed man lowered through a roof", performer:"Jesus", era:5, book:"Mark", ref:"Mark 2:5-12" },
  { desc:"Rising from the dead on the third day", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 28:5-6" },
  { desc:"Healing a centurion's servant from a distance", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 8:13" },
  { desc:"Healing the blind beggar Bartimaeus near Jericho", performer:"Jesus", era:5, book:"Mark", ref:"Mark 10:46-52" },
  { desc:"Casting a legion of demons into a herd of swine", performer:"Jesus", era:5, book:"Mark", ref:"Mark 5:12-13" },
  { desc:"Healing a woman who touched the hem of His garment", performer:"Jesus", era:5, book:"Luke", ref:"Luke 8:43-48" },
  { desc:"Raising Jairus's daughter from death", performer:"Jesus", era:5, book:"Mark", ref:"Mark 5:41-42" },
  { desc:"Healing a man's withered hand on the Sabbath", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 12:13" },
  { desc:"A miraculous catch of fish after a night of catching nothing", performer:"Jesus", era:5, book:"Luke", ref:"Luke 5:5-7" },
  { desc:"Feeding four thousand with seven loaves and a few small fish", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 15:36-38" },
  { desc:"Cursing a fig tree so that it withered", performer:"Jesus", era:5, book:"Matthew", ref:"Matthew 21:19" },
  { desc:"Restoring the ear of the high priest's servant Malchus", performer:"Jesus", era:5, book:"Luke", ref:"Luke 22:50-51" },
  { desc:"Healing a lame beggar at the temple gate", performer:"Peter", era:6, book:"Acts", ref:"Acts 3:6-8" },
  { desc:"Being freed from prison by an angel at night", performer:"Peter", era:6, book:"Acts", ref:"Acts 12:7-10" },
  { desc:"Surviving a venomous viper bite unharmed on Malta", performer:"Paul", era:6, book:"Acts", ref:"Acts 28:3-5" },
  { desc:"Raising Eutychus after he fell from a window", performer:"Paul", era:6, book:"Acts", ref:"Acts 20:9-10" },
  { desc:"Adam and Eve being clothed with garments of skin", performer:"God", era:1, book:"Genesis", ref:"Genesis 3:21" },
  { desc:"Preserving Noah and his family through the great Flood", performer:"God", era:1, book:"Genesis", ref:"Genesis 7:23" },
  { desc:"Blessing Abraham after his victory in battle", performer:"Melchizedek", era:1, book:"Genesis", ref:"Genesis 14:18-20" },
  { desc:"Parting the Jordan River for Israel to cross into Canaan", performer:"Joshua", era:3, book:"Joshua", ref:"Joshua 3:14-17" },
  { desc:"Testing God's will with a fleece left wet while the ground stayed dry", performer:"Gideon", era:3, book:"Judges", ref:"Judges 6:36-40" },
  { desc:"Defeating a vast Midianite army with only three hundred men", performer:"Gideon", era:3, book:"Judges", ref:"Judges 7:19-22" },
  { desc:"Being struck blind on the road to Damascus", performer:"Saul (Paul)", era:6, book:"Acts", ref:"Acts 9:3-9" },
  { desc:"Healing the sick simply by his shadow passing over them", performer:"Peter", era:6, book:"Acts", ref:"Acts 5:15-16" },
  { desc:"Healing the sick through handkerchiefs carried from his body", performer:"Paul", era:6, book:"Acts", ref:"Acts 19:11-12" }
];

/** Parables — teacher, book, and the main lesson each one illustrates. */
const PARABLES = [
  { title:"The Sower", lesson:"how people receive God's word differently", book:"Matthew", ref:"Matthew 13:3-8" },
  { title:"The Mustard Seed", lesson:"the surprising growth of God's kingdom from small beginnings", book:"Matthew", ref:"Matthew 13:31-32" },
  { title:"The Wheat and the Tares", lesson:"good and evil coexisting until the final judgment", book:"Matthew", ref:"Matthew 13:24-30" },
  { title:"The Lost Sheep", lesson:"God's pursuit of the one who strays", book:"Luke", ref:"Luke 15:4-6" },
  { title:"The Prodigal Son", lesson:"a father's forgiveness and joy over a repentant child", book:"Luke", ref:"Luke 15:11-24" },
  { title:"The Good Samaritan", lesson:"loving your neighbor, even an unexpected one", book:"Luke", ref:"Luke 10:30-35" },
  { title:"The Talents", lesson:"faithfully using what God entrusts to us", book:"Matthew", ref:"Matthew 25:14-30" },
  { title:"The Wise and Foolish Builders", lesson:"building a life on obedience, not just hearing", book:"Matthew", ref:"Matthew 7:24-27" },
  { title:"The Pharisee and the Tax Collector", lesson:"humility in prayer over self-righteousness", book:"Luke", ref:"Luke 18:10-14" },
  { title:"The Unforgiving Servant", lesson:"forgiving others as we ourselves have been forgiven", book:"Matthew", ref:"Matthew 18:23-35" },
  { title:"The Ten Virgins", lesson:"staying spiritually ready for Christ's return", book:"Matthew", ref:"Matthew 25:1-13" },
  { title:"The Rich Fool", lesson:"the folly of hoarding wealth instead of being rich toward God", book:"Luke", ref:"Luke 12:16-21" },
  { title:"The Workers in the Vineyard", lesson:"God's generosity, which is not bound by human fairness", book:"Matthew", ref:"Matthew 20:1-16" },
  { title:"The Persistent Widow", lesson:"persevering in prayer without giving up", book:"Luke", ref:"Luke 18:1-8" },
  { title:"The Rich Man and Lazarus", lesson:"the reversal of fortunes between this life and the next", book:"Luke", ref:"Luke 16:19-31" },
  { title:"The Good Shepherd", lesson:"Christ's willingness to lay down His life for His sheep", book:"John", ref:"John 10:11-15" },
  { title:"The Vine and the Branches", lesson:"abiding in Christ as the source of a fruitful life", book:"John", ref:"John 15:1-5" },
  { title:"The Barren Fig Tree", lesson:"patience alongside a genuine call to repentance", book:"Luke", ref:"Luke 13:6-9" },
  { title:"The Two Debtors", lesson:"loving much because one has been forgiven much", book:"Luke", ref:"Luke 7:41-43" },
  { title:"The Great Banquet", lesson:"God's invitation extended widely after the first guests refuse", book:"Luke", ref:"Luke 14:16-24" }
];

/** The Twelve, plus Matthias and Paul — a short defining fact for each. */
const APOSTLES = [
  { name:"Peter", fact:"denied knowing Jesus three times before the rooster crowed", ref:"Luke 22:60-62" },
  { name:"Andrew", fact:"was Peter's brother and one of the first disciples called", ref:"John 1:40-42" },
  { name:"James, son of Zebedee", fact:"was the first of the Twelve to be martyred", ref:"Acts 12:2" },
  { name:"John", fact:"is traditionally called 'the disciple whom Jesus loved'", ref:"John 21:20" },
  { name:"Philip", fact:"brought Nathanael to come and see Jesus", ref:"John 1:45-46" },
  { name:"Bartholomew", fact:"is widely identified with Nathanael", ref:"John 1:47-49" },
  { name:"Thomas", fact:"doubted the resurrection until he touched Jesus' wounds", ref:"John 20:27-28" },
  { name:"Matthew", fact:"was a tax collector before Jesus called him", ref:"Matthew 9:9" },
  { name:"James, son of Alphaeus", fact:"is sometimes called 'James the Less'", ref:"Mark 3:18" },
  { name:"Thaddaeus", fact:"is also known as Judas, son of James", ref:"Luke 6:16" },
  { name:"Simon the Zealot", fact:"belonged to a movement opposed to Roman rule", ref:"Luke 6:15" },
  { name:"Judas Iscariot", fact:"betrayed Jesus for thirty pieces of silver", ref:"Matthew 26:14-15" },
  { name:"Matthias", fact:"was chosen by lot to replace Judas Iscariot", ref:"Acts 1:26" },
  { name:"Paul", fact:"was formerly a persecutor of the church named Saul", ref:"Acts 9:1-4" }
];

/** Notable places tied to a defining event. */
const PLACES = [
  { name:"Eden", event:"where the first humans lived before the Fall", era:1, ref:"Genesis 2:8-9" },
  { name:"Ararat", event:"where the ark came to rest after the Flood", era:1, ref:"Genesis 8:4" },
  { name:"Babel", event:"where a tower was built and languages were confused", era:1, ref:"Genesis 11:9" },
  { name:"Ur", event:"Abraham's original hometown before he set out in faith", era:1, ref:"Genesis 11:31" },
  { name:"Haran", event:"where Abraham's family settled on the way to Canaan", era:1, ref:"Genesis 11:31-32" },
  { name:"Moriah", event:"where Abraham was tested and offered Isaac", era:1, ref:"Genesis 22:2" },
  { name:"Bethel", event:"where Jacob dreamed of a ladder reaching to heaven", era:1, ref:"Genesis 28:11-19" },
  { name:"Peniel", event:"where Jacob wrestled with the angel and was renamed Israel", era:1, ref:"Genesis 32:30" },
  { name:"Machpelah", event:"the cave Abraham bought as a family burial site", era:1, ref:"Genesis 23:17-19" },
  { name:"Sodom", event:"a city destroyed by fire and brimstone for its wickedness", era:1, ref:"Genesis 19:24-25" },
  { name:"Zoar", event:"the small city Lot fled to as Sodom was destroyed", era:1, ref:"Genesis 19:22-23" },
  { name:"Beersheba", event:"where Abraham made a covenant and dug a well", era:1, ref:"Genesis 21:31-32" },
  { name:"Shechem", event:"where Jacob's family settled after returning to Canaan", era:1, ref:"Genesis 33:18-19" },
  { name:"Goshen", event:"where the Israelites settled during their time in Egypt", era:2, ref:"Genesis 47:6" },
  { name:"Mount Sinai", event:"where Moses received the Ten Commandments", era:2, ref:"Exodus 19:20" },
  { name:"Kadesh Barnea", event:"where the twelve spies brought back their report of Canaan", era:2, ref:"Numbers 13:26" },
  { name:"Marah", event:"where Moses turned bitter water sweet for the people", era:2, ref:"Exodus 15:23-25" },
  { name:"Mount Nebo", event:"where Moses viewed the promised land before his death", era:2, ref:"Deuteronomy 34:1-4" },
  { name:"Jericho", event:"the first city conquered after entering the promised land", era:3, ref:"Joshua 6:1-2" },
  { name:"Shiloh", event:"where the tabernacle rested for generations", era:3, ref:"Joshua 18:1" },
  { name:"Jerusalem", event:"the city David made his capital", era:3, ref:"2 Samuel 5:6-9" },
  { name:"Bethlehem", event:"the birthplace of both David and Jesus", era:3, ref:"Micah 5:2" },
  { name:"Endor", event:"where Saul consulted a medium before his final battle", era:3, ref:"1 Samuel 28:7" },
  { name:"Gath", event:"the Philistine hometown of the giant Goliath", era:3, ref:"1 Samuel 17:4" },
  { name:"Hebron", event:"where David first reigned as king, over Judah alone", era:3, ref:"2 Samuel 2:1-4" },
  { name:"Gibeon", event:"where Joshua's forces fought as the sun stood still", era:3, ref:"Joshua 10:12" },
  { name:"Samaria", event:"the capital of the northern kingdom of Israel", era:4, ref:"1 Kings 16:24" },
  { name:"Babylon", event:"where the southern kingdom was carried into exile", era:4, ref:"2 Kings 25:8-11" },
  { name:"Nineveh", event:"the city Jonah was sent to warn", era:4, ref:"Jonah 1:2" },
  { name:"Mount Carmel", event:"where Elijah defeated the prophets of Baal in a contest of fire", era:4, ref:"1 Kings 18:19-20" },
  { name:"Jezreel", event:"where Naboth's vineyard stood, coveted by King Ahab", era:4, ref:"1 Kings 21:1" },
  { name:"Nazareth", event:"the town where Jesus grew up", era:5, ref:"Luke 2:39-40" },
  { name:"Capernaum", event:"Jesus' home base for much of His ministry", era:5, ref:"Matthew 4:13" },
  { name:"Golgotha", event:"the place where Jesus was crucified", era:5, ref:"John 19:17-18" },
  { name:"Bethany", event:"the hometown of Lazarus, Martha, and Mary", era:5, ref:"John 11:1" },
  { name:"Jordan River", event:"where Jesus was baptized by John", era:5, ref:"Matthew 3:13" },
  { name:"Sea of Galilee", event:"the setting for many of Jesus' miracles, including calming a storm", era:5, ref:"Mark 4:1" },
  { name:"Mount of Olives", event:"where Jesus often prayed and taught overlooking Jerusalem", era:5, ref:"Luke 22:39" },
  { name:"Gethsemane", event:"the garden where Jesus prayed before His arrest", era:5, ref:"Matthew 26:36" },
  { name:"Cana", event:"the town where Jesus performed His first miracle", era:5, ref:"John 2:1-2" },
  { name:"Antioch", event:"where believers were first called Christians", era:6, ref:"Acts 11:26" },
  { name:"Damascus", event:"where Saul encountered Jesus and was converted", era:6, ref:"Acts 9:3-6" },
  { name:"Corinth", event:"a city Paul wrote two New Testament letters to", era:6, ref:"Acts 18:1" },
  { name:"Ephesus", event:"a major city Paul ministered in for over two years", era:6, ref:"Acts 19:1" },
  { name:"Rome", event:"the capital Paul reached under guard, and addressed his letter to Romans there", era:6, ref:"Acts 28:16" },
  { name:"Patmos", event:"the island where John received the vision of Revelation", era:7, ref:"Revelation 1:9" },
  { name:"The New Jerusalem", event:"the holy city described descending from heaven in John's vision", era:7, ref:"Revelation 21:2" },
  { name:"Armageddon", event:"the place named for the final gathering of earth's kings for battle", era:7, ref:"Revelation 16:16" },
  { name:"Nod", event:"the land east of Eden where Cain settled after killing Abel", era:1, ref:"Genesis 4:16" },
  { name:"Mamre", event:"where Abraham was visited by three heavenly visitors", era:1, ref:"Genesis 18:1" },
  { name:"Emmaus", event:"the village where the risen Jesus walked with two disciples", era:5, ref:"Luke 24:13-15" },
  { name:"Mizpah", event:"where Samuel led Israel in repentance before a victory over the Philistines", era:3, ref:"1 Samuel 7:5-10" },
  { name:"Ziklag", event:"the town David used as a base while fleeing from Saul", era:3, ref:"1 Samuel 27:6" },
  { name:"Valley of Elah", event:"where David fought and defeated Goliath", era:3, ref:"1 Samuel 17:2" },
  { name:"Tarsus", event:"the hometown of the apostle Paul", era:6, ref:"Acts 22:3" },
  { name:"Philippi", event:"the city where Paul and Silas were imprisoned and miraculously freed", era:6, ref:"Acts 16:23-26" },
  { name:"Athens", event:"where Paul preached about the 'unknown god' at the Areopagus", era:6, ref:"Acts 17:22-23" },
  { name:"Caesarea", event:"where Paul was held prisoner before being sent to Rome", era:6, ref:"Acts 23:33" }
];

/** Short, well-known KJV verse fragments (public domain) tagged by book. */
const VERSE_FRAGMENTS = [
  { frag:"In the beginning God created the heaven and the earth.", book:"Genesis", ref:"Genesis 1:1" },
  { frag:"Thou shalt have no other gods before me.", book:"Exodus", ref:"Exodus 20:3" },
  { frag:"The Lord is my shepherd; I shall not want.", book:"Psalms", ref:"Psalms 23:1" },
  { frag:"Trust in the Lord with all thine heart.", book:"Proverbs", ref:"Proverbs 3:5" },
  { frag:"For unto us a child is born, unto us a son is given.", book:"Isaiah", ref:"Isaiah 9:6" },
  { frag:"They that wait upon the Lord shall renew their strength.", book:"Isaiah", ref:"Isaiah 40:31" },
  { frag:"For I know the thoughts that I think toward you, saith the Lord.", book:"Jeremiah", ref:"Jeremiah 29:11" },
  { frag:"I will pour out my spirit upon all flesh.", book:"Joel", ref:"Joel 2:28" },
  { frag:"Ye are the light of the world.", book:"Matthew", ref:"Matthew 5:14" },
  { frag:"Go ye therefore, and teach all nations.", book:"Matthew", ref:"Matthew 28:19" },
  { frag:"Thou shalt love the Lord thy God with all thy heart.", book:"Mark", ref:"Mark 12:30" },
  { frag:"For unto you is born this day a Saviour.", book:"Luke", ref:"Luke 2:11" },
  { frag:"In the beginning was the Word.", book:"John", ref:"John 1:1" },
  { frag:"For God so loved the world.", book:"John", ref:"John 3:16" },
  { frag:"I am the way, the truth, and the life.", book:"John", ref:"John 14:6" },
  { frag:"I am the good shepherd.", book:"John", ref:"John 10:11" },
  { frag:"Ye must be born again.", book:"John", ref:"John 3:7" },
  { frag:"It is finished.", book:"John", ref:"John 19:30" },
  { frag:"Blessed are the poor in spirit.", book:"Matthew", ref:"Matthew 5:3" },
  { frag:"Ask, and it shall be given you.", book:"Matthew", ref:"Matthew 7:7" },
  { frag:"Today shalt thou be with me in paradise.", book:"Luke", ref:"Luke 23:43" },
  { frag:"The sabbath was made for man.", book:"Mark", ref:"Mark 2:27" },
  { frag:"Ye shall receive power, after the Holy Ghost is come upon you.", book:"Acts", ref:"Acts 1:8" },
  { frag:"All things work together for good to them that love God.", book:"Romans", ref:"Romans 8:28" },
  { frag:"There is therefore now no condemnation to them which are in Christ Jesus.", book:"Romans", ref:"Romans 8:1" },
  { frag:"The wages of sin is death; but the gift of God is eternal life.", book:"Romans", ref:"Romans 6:23" },
  { frag:"For all have sinned, and come short of the glory of God.", book:"Romans", ref:"Romans 3:23" },
  { frag:"If God be for us, who can be against us?", book:"Romans", ref:"Romans 8:31" },
  { frag:"Be not conformed to this world, but be ye transformed.", book:"Romans", ref:"Romans 12:2" },
  { frag:"Charity suffereth long, and is kind.", book:"1 Corinthians", ref:"1 Corinthians 13:4" },
  { frag:"The fruit of the Spirit is love, joy, peace.", book:"Galatians", ref:"Galatians 5:22" },
  { frag:"Put on the whole armour of God.", book:"Ephesians", ref:"Ephesians 6:11" },
  { frag:"I can do all things through Christ which strengtheneth me.", book:"Philippians", ref:"Philippians 4:13" },
  { frag:"Casting all your care upon him; for he careth for you.", book:"1 Peter", ref:"1 Peter 5:7" },
  { frag:"Now faith is the substance of things hoped for.", book:"Hebrews", ref:"Hebrews 11:1" },
  { frag:"Count it all joy when ye fall into divers temptations.", book:"James", ref:"James 1:2" },
  { frag:"God shall wipe away all tears from their eyes.", book:"Revelation", ref:"Revelation 21:4" },
  { frag:"I am Alpha and Omega, the beginning and the ending, saith the Lord.", book:"Revelation", ref:"Revelation 1:8" },
  { frag:"Behold, I stand at the door, and knock.", book:"Revelation", ref:"Revelation 3:20" },
  { frag:"Worthy is the Lamb that was slain.", book:"Revelation", ref:"Revelation 5:12" },
  { frag:"Behold, I make all things new.", book:"Revelation", ref:"Revelation 21:5" },
  { frag:"A soft answer turneth away wrath.", book:"Proverbs", ref:"Proverbs 15:1" },
  { frag:"Pride goeth before destruction.", book:"Proverbs", ref:"Proverbs 16:18" },
  { frag:"Iron sharpeneth iron.", book:"Proverbs", ref:"Proverbs 27:17" },
  { frag:"The fear of the Lord is the beginning of knowledge.", book:"Proverbs", ref:"Proverbs 1:7" },
  { frag:"A merry heart doeth good like a medicine.", book:"Proverbs", ref:"Proverbs 17:22" },
  { frag:"Where there is no vision, the people perish.", book:"Proverbs", ref:"Proverbs 29:18" },
  { frag:"Train up a child in the way he should go.", book:"Proverbs", ref:"Proverbs 22:6" },
  { frag:"A good name is rather to be chosen than great riches.", book:"Proverbs", ref:"Proverbs 22:1" },
  { frag:"The Lord giveth wisdom: out of his mouth cometh knowledge.", book:"Proverbs", ref:"Proverbs 2:6" },
  { frag:"Vanity of vanities; all is vanity.", book:"Ecclesiastes", ref:"Ecclesiastes 1:2" },
  { frag:"To every thing there is a season.", book:"Ecclesiastes", ref:"Ecclesiastes 3:1" },
  { frag:"Two are better than one.", book:"Ecclesiastes", ref:"Ecclesiastes 4:9" },
  { frag:"Whatsoever thy hand findeth to do, do it with thy might.", book:"Ecclesiastes", ref:"Ecclesiastes 9:10" },
  { frag:"Remember now thy Creator in the days of thy youth.", book:"Ecclesiastes", ref:"Ecclesiastes 12:1" },
  { frag:"Fear God, and keep his commandments.", book:"Ecclesiastes", ref:"Ecclesiastes 12:13" }
];

/** Key milestone events per era, used both for Stronghold ordering puzzles
 *  and for the narrative chapter-transition lines. */
const ERA_MILESTONES = [
  { event:"Creation", era:1, order:1, ref:"Genesis 1:1" },{ event:"The Fall", era:1, order:2, ref:"Genesis 3:6-7" },
  { event:"The Flood", era:1, order:3, ref:"Genesis 7:17" },{ event:"Tower of Babel", era:1, order:4, ref:"Genesis 11:4-8" },
  { event:"Call of Abraham", era:1, order:5, ref:"Genesis 12:1-4" },{ event:"Abraham and Lot Separate", era:1, order:6, ref:"Genesis 13:8-11" },
  { event:"Angels Visit Lot in Sodom", era:1, order:7, ref:"Genesis 19:1" },{ event:"Destruction of Sodom and Gomorrah", era:1, order:8, ref:"Genesis 19:24-25" },
  { event:"Binding of Isaac on Mount Moriah", era:1, order:9, ref:"Genesis 22:9-13" },{ event:"Jacob's Ladder at Bethel", era:1, order:10, ref:"Genesis 28:12" },
  { event:"Jacob Wrestles the Angel at Peniel", era:1, order:11, ref:"Genesis 32:24-28" },{ event:"Joseph Sold into Slavery", era:1, order:12, ref:"Genesis 37:27-28" },
  { event:"Joseph Rises to Power in Egypt", era:1, order:13, ref:"Genesis 41:39-41" },{ event:"Jacob's Family Reunited in Egypt", era:1, order:14, ref:"Genesis 46:29-30" },
  { event:"Plagues of Egypt", era:2, order:1, ref:"Exodus 7:14" },{ event:"Crossing the Red Sea", era:2, order:2, ref:"Exodus 14:21-22" },
  { event:"Mount Sinai & the Law", era:2, order:3, ref:"Exodus 20:1-17" },{ event:"Golden Calf", era:2, order:4, ref:"Exodus 32:1-4" },
  { event:"The Twelve Spies Scout Canaan", era:2, order:5, ref:"Numbers 13:1-2" },{ event:"Korah's Rebellion", era:2, order:6, ref:"Numbers 16:1-3" },
  { event:"The Bronze Serpent", era:2, order:7, ref:"Numbers 21:8-9" },{ event:"Forty Years of Wandering", era:2, order:8, ref:"Numbers 14:33-34" },
  { event:"Moses Views the Promised Land from Nebo", era:2, order:9, ref:"Deuteronomy 34:1-4" },
  { event:"Fall of Jericho", era:3, order:1, ref:"Joshua 6:20" },{ event:"Era of the Judges", era:3, order:2, ref:"Judges 2:16" },
  { event:"Saul Crowned King", era:3, order:3, ref:"1 Samuel 10:1" },{ event:"David Defeats Goliath", era:3, order:4, ref:"1 Samuel 17:49-50" },
  { event:"Davidic Kingdom Established", era:3, order:5, ref:"2 Samuel 5:3-4" },{ event:"The Ark of the Covenant Returns to Jerusalem", era:3, order:6, ref:"2 Samuel 6:12-15" },
  { event:"Solomon's Temple Built", era:3, order:7, ref:"1 Kings 6:1" },{ event:"Solomon's Wisdom and the Queen of Sheba's Visit", era:3, order:8, ref:"1 Kings 10:1-3" },
  { event:"Kingdom Divides", era:3, order:9, ref:"1 Kings 12:16-20" },
  { event:"Elijah on Mount Carmel", era:4, order:1, ref:"1 Kings 18:38-39" },{ event:"Elijah Taken Up in a Chariot of Fire", era:4, order:2, ref:"2 Kings 2:11" },
  { event:"Ahab Seizes Naboth's Vineyard", era:4, order:3, ref:"1 Kings 21:15-16" },{ event:"Assyrian Exile of Israel", era:4, order:4, ref:"2 Kings 17:6" },
  { event:"Josiah's Reforms", era:4, order:5, ref:"2 Kings 23:1-3" },{ event:"Belshazzar's Feast and the Handwriting on the Wall", era:4, order:6, ref:"Daniel 5:5-6" },
  { event:"Babylonian Exile of Judah", era:4, order:7, ref:"2 Kings 25:8-11" },{ event:"Daniel in the Lions' Den", era:4, order:8, ref:"Daniel 6:16" },
  { event:"Return and Rebuilding of the Walls", era:4, order:9, ref:"Nehemiah 6:15" },
  { event:"Birth of Jesus", era:5, order:1, ref:"Luke 2:6-7" },{ event:"John Baptizes Jesus", era:5, order:2, ref:"Matthew 3:13-17" },
  { event:"Ministry in Galilee", era:5, order:3, ref:"Luke 4:14-15" },{ event:"The Crucifixion", era:5, order:4, ref:"Matthew 27:35" },
  { event:"The Resurrection", era:5, order:5, ref:"Matthew 28:5-6" },
  { event:"Pentecost", era:6, order:1, ref:"Acts 2:1-4" },{ event:"Stephen Martyred", era:6, order:2, ref:"Acts 7:59-60" },
  { event:"Saul's Conversion", era:6, order:3, ref:"Acts 9:3-6" },{ event:"Paul's Missionary Journeys", era:6, order:4, ref:"Acts 13:2-3" },
  { event:"Jerusalem Council", era:6, order:5, ref:"Acts 15:6-11" },{ event:"Paul Sent to Rome", era:6, order:6, ref:"Acts 27:1" },
  { event:"Letters to the Seven Churches", era:7, order:1, ref:"Revelation 2:1" },{ event:"Opening of the Seven Seals", era:7, order:2, ref:"Revelation 6:1" },
  { event:"Sounding of the Seven Trumpets", era:7, order:3, ref:"Revelation 8:6" },{ event:"The Beast and Babylon Defeated", era:7, order:4, ref:"Revelation 19:19-20" },
  { event:"The Thousand-Year Reign", era:7, order:5, ref:"Revelation 20:4" },{ event:"The Great White Throne Judgment", era:7, order:6, ref:"Revelation 20:11-12" },
  { event:"New Heaven and New Earth", era:7, order:7, ref:"Revelation 21:1" },{ event:"The New Jerusalem Descends", era:7, order:8, ref:"Revelation 21:2" }
];

/** Short narrative vignettes shown as a "chapter transition" before each era. */
const ERA_NARRATIVE = [
  [ "In the beginning, God formed a world and called it good.",
    "But sin entered, and with it, distance from the One who made us.",
    "One family — Abraham's — is chosen to carry hope forward." ],
  [ "Centuries have passed...",
    "Israel cries out beneath Pharaoh's oppression in Egypt.",
    "God raises up Moses to lead His people toward freedom." ],
  [ "Free from bondage, Israel enters a promised land.",
    "Judges rise and fall, then kings — Saul, David, Solomon.",
    "A kingdom is built, and a temple raised to the Lord." ],
  [ "The kingdom divides, and hearts drift from God.",
    "Prophets thunder warnings that few are willing to hear.",
    "Exile comes — yet even in Babylon, hope is not extinguished." ],
  [ "In the fullness of time, a child is born in Bethlehem.",
    "He teaches, heals, and calls the lost to follow Him.",
    "The Light of the World has come to renew every mind." ],
  [ "The tomb is empty, and a promised Spirit falls like fire.",
    "The good news spreads from Jerusalem to the ends of the earth.",
    "Ordinary believers carry an unstoppable message forward." ],
  [ "John, exiled on Patmos, is given a vision beyond time.",
    "Darkness makes its final stand against the Light.",
    "And in the end, every tear is wiped away." ]
];