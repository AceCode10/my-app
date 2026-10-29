import type { Checkpoint } from './types';

/**
 * Section 7 — The Systems Life Cycle.
 * Validation, verification and data structures are taught in 7.2 Design, so the
 * paper's validation questions are attached there rather than to testing.
 */
export const topic07Checkpoints: Checkpoint[] = [
  {
    id: 't7-q1',
    section: 's7-5',
    source: 'March 2023 · Paper 0417/12 · Q3',
    parts: [
      {
        prompt: 'State three items that should be included in the technical documentation of a computer system.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'Purpose of the system / program',
          'Limitations of the system',
          'Program listing (source code)',
          'Programming language used',
          'Program flowcharts or algorithms',
          'System flowcharts',
          'Hardware and software requirements',
          'File structures, validation routines and test runs with test data and results',
        ],
        examinerTip:
          'Technical documentation is for the developers who maintain the system. A tutorial, a troubleshooting guide or "how to load the software" belongs in USER documentation.',
      },
    ],
  },
  {
    id: 't7-q2',
    section: 's7-2',
    source: 'March 2023 · Paper 0417/12 · Q17(a)',
    stem: 'Verification and validation are used to check data.',
    parts: [
      {
        prompt: 'Identify and describe two methods of verification.',
        marks: 4,
        answerSlots: 2,
        markPoints: [
          'Visual verification (visual check) — the person entering the data reads it back on screen and compares it with the original document to spot typing errors.',
          'Double data entry — the data is entered twice, by the same person or two different people, and the computer compares the two copies and reports any difference.',
        ],
        examinerTip:
          'Four marks: one for naming each method, one for describing it. Verification checks the data matches the source; validation checks it is sensible — do not confuse them.',
      },
    ],
  },
  {
    id: 't7-q3',
    section: 's7-4',
    source: 'March 2023 · Paper 0417/12 · Q15',
    stem: 'Tawara Stores is a small company that does not make much profit. The managing director is deciding whether to implement a new IT system using direct changeover or parallel running.',
    parts: [
      {
        prompt: 'Describe the advantages and disadvantages of using direct changeover compared with parallel running in this scenario.',
        marks: 6,
        markPoints: [
          'Advantage: only one system runs, so it costs far less — important for a company with little profit.',
          'Advantage: data does not have to be entered twice, so fewer staff hours and no extra wages.',
          'Advantage: the benefits of the new system are available immediately.',
          'Advantage: no extra hardware is needed to run two systems side by side.',
          'Disadvantage: if the new system fails there is no old system to fall back on, so trading could stop.',
          'Disadvantage: data could be lost, and the company may not be able to afford the consequences.',
          'Disadvantage: results cannot be compared against the old system, so errors are harder to spot.',
          'Disadvantage: staff must be fully trained before the switch, with no gradual transition.',
        ],
        examinerTip:
          'Answer for THIS company — a small business with little profit. The cost advantage and the risk of having no fallback are the two points the context is pointing at.',
      },
    ],
  },
  {
    id: 't7-q4',
    section: 's7-2',
    source: 'June 2023 · Paper 0417/11 · Q1',
    stem: 'A book has an ISBN which is 330247204X. Tick the most appropriate data type for the ISBN.',
    optionList: ['A Numeric: integer', 'B Text', 'C Boolean', 'D Date'],
    parts: [
      {
        prompt: 'Which data type is most appropriate, and why?',
        marks: 1,
        markPoints: [
          'B — Text. The ISBN contains the letter X, so it cannot be stored as a number, and no arithmetic is ever done with it.',
        ],
      },
    ],
  },
  {
    id: 't7-q5',
    section: 's7-1',
    source: 'June 2023 · Paper 0417/11 · Q7(a)',
    stem: 'A systems analyst has been asked to carry out an analysis of a company’s current computer system.',
    parts: [
      {
        prompt: 'State three methods of analysing the current system.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'Observation — watching the users operate the current system.',
          'Interviews — questioning individual users face to face.',
          'Questionnaires — forms sent to many users to complete and return.',
          'Examining existing documentation — looking at the current paperwork, files and reports.',
        ],
      },
    ],
  },
  {
    id: 't7-q6',
    section: 's7-5',
    source: 'June 2023 · Paper 0417/11 · Q7(b)',
    stem: 'The systems analyst is working with a team to create some new software. The software documentation will be stored on the cloud.',
    parts: [
      {
        prompt: 'Describe how the team can use the cloud to share the documentation.',
        marks: 4,
        markPoints: [
          'The documents are uploaded to a shared folder on the cloud provider’s servers.',
          'Each team member is given access rights — read-only or read/write — and logs in with a username and password.',
          'Members can open and edit the documents from any location and any internet-connected device.',
          'Everyone works on the same single copy, so there is one up-to-date version rather than several conflicting ones.',
          'Some members can edit at the same time, and changes appear to the others in real time.',
          'The service keeps version history, so an earlier version can be restored, and the files are backed up automatically.',
        ],
      },
    ],
  },
  {
    id: 't7-q7',
    section: 's4-2',
    source: 'June 2023 · Paper 0417/11 · Q7(c)',
    stem: 'Members of the team can use video-conferencing to join business meetings from different locations around the world.',
    parts: [
      {
        prompt:
          'Describe, giving reasons, three disadvantages of using video-conferencing for business meetings rather than meeting in person.',
        marks: 6,
        answerSlots: 3,
        markPoints: [
          'Time-zone differences mean someone has to attend at an unsociable hour, so they are tired and contribute less.',
          'The connection may lag, break up or drop out, so parts of the meeting are missed and decisions are delayed.',
          'Setting up needs webcams, microphones and compatible software, which is costly and may fail on the day.',
          'Body language and eye contact are hard to read on screen, so misunderstandings are more likely.',
          'Documents and physical products cannot be handed round or demonstrated.',
          'Informal conversation before and after a meeting, where much business relationship-building happens, is lost.',
          'Staff need training to use the equipment confidently.',
        ],
        examinerTip:
          'Six marks for three disadvantages — the command word is "giving reasons", so each point needs a consequence for the business.',
      },
    ],
  },
  {
    id: 't7-q8',
    section: 's7-2',
    source: 'June 2023 · Paper 0417/12 · Q1',
    stem: 'A book contains a bar code whose number is 503619309903. Tick the most appropriate validation check to test the validity of the bar code.',
    optionList: ['A check digit', 'B format check', 'C range check', 'D spell check'],
    parts: [
      {
        prompt: 'Which validation check is most appropriate, and why?',
        marks: 1,
        markPoints: [
          'A — check digit. The final digit is calculated from the other digits, so the computer can recalculate it and detect a mistyped or misread bar code.',
        ],
      },
    ],
  },
  {
    id: 't7-q9',
    section: 's7-3',
    source: 'June 2023 · Paper 0417/12 · Q7',
    stem: 'A student is creating a spreadsheet that includes a formula to check a number entered in a cell is between two values. The number is entered in cell A10 as an integer. If the number is between the two values then ‘OK’ is displayed, otherwise ‘error’ is displayed. The formula is =IF(AND(A10>1,A10<32),"OK","error")',
    parts: [
      {
        label: 'a',
        prompt: 'Identify two items of extreme test data the student should use and give the reason why this data was chosen.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'Extreme test data 1: 2 (the smallest value that should be accepted).',
          'Extreme test data 2: 31 (the largest value that should be accepted).',
          'Reason: extreme data sits on the boundary of the acceptable range, so it checks the formula accepts the limits and has not been written with the wrong comparison operator.',
        ],
        examinerTip:
          'Read the formula carefully: A10>1 and A10<32 accept 2 to 31, NOT 1 and 32. Those two values are abnormal here.',
      },
      {
        label: 'b',
        prompt: 'The student has entered an item of abnormal test data. Explain why abnormal test data is used.',
        marks: 3,
        markPoints: [
          'Abnormal data is data that should be rejected by the system — for example 0, 45 or the word "cat".',
          'It is used to check that the formula correctly rejects it and displays ‘error’.',
          'It proves the system does not accept and process invalid data, which would produce wrong results.',
          'It also checks the system does not crash when unexpected data is entered.',
        ],
      },
    ],
  },
  {
    id: 't7-q10',
    section: 's7-2',
    source: 'June 2023 · Paper 0417/13 · Q1',
    stem: 'A book has an ISBN which is 0 330 24720 4. Tick the most appropriate validation check to test the validity of the ISBN.',
    optionList: ['A character check', 'B format check', 'C length check', 'D range check'],
    parts: [
      {
        prompt: 'Which validation check is most appropriate, and why?',
        marks: 1,
        markPoints: [
          'C — length check. An ISBN of this form is always 10 digits, so the computer can check the correct number of characters has been entered.',
        ],
      },
    ],
  },
  {
    id: 't7-q11',
    section: 's7-2',
    source: 'November 2023 · Paper 0417/11 · Q10',
    stem: 'A teacher has set up a database for a class library. The data about the books will be entered by the teacher.',
    parts: [
      {
        label: 'a',
        prompt:
          'The data can be verified by double data entry or visual verification. Compare double data entry with visual verification. Your answer must include similarities and differences.',
        marks: 4,
        markPoints: [
          'Similarity: both are verification methods that check the data entered matches the original source document.',
          'Similarity: neither can tell whether the original data was correct in the first place.',
          'Difference: double data entry requires the data to be typed twice, whereas visual verification requires it to be typed once and read back.',
          'Difference: in double data entry the computer compares the two copies automatically, whereas visual verification relies on the person spotting the error.',
          'Difference: double data entry takes longer and costs more, but is more reliable; visual verification is quicker but errors are easily missed.',
          'Difference: double data entry reports a difference without saying which copy is right, so the operator must still check the source.',
        ],
      },
      {
        label: 'b',
        prompt:
          'When data is entered into a date field it is validated. An example of the data that could be entered is 01/04/2023. State two validation checks that could be used on this data.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Format check — the data must match the pattern DD/MM/YYYY.',
          'Length check — the entry must be 10 characters long.',
          'Range check — the day must be 1–31 and the month 1–12.',
          'Type check — the day, month and year parts must be numeric.',
          'Presence check — the field must not be left empty.',
        ],
      },
    ],
  },
  {
    id: 't7-q12',
    section: 's7-2',
    source: 'November 2023 · Paper 0417/12 · Q4',
    stem: 'A teacher is creating a database for a class library with the fields Book_number (e.g. 1101), Name_of_book, Publisher, Date_acquired (e.g. 02/11/2020) and ISBN (e.g. 9780119192065). Identify and describe a validation check for each field below. Each validation check must be different.',
    parts: [
      {
        label: 'Book_number',
        prompt: 'Identify and describe a validation check that could be applied to Book_number.',
        marks: 2,
        markPoints: [
          'Length check — the book number must be exactly 4 characters long, so 110 or 11010 is rejected.',
          'Alternative: type check — only numeric digits may be entered.',
          'Alternative: range check — the number must lie between 1000 and 9999.',
        ],
      },
      {
        label: 'Date_acquired',
        prompt: 'Identify and describe a validation check that could be applied to Date_acquired.',
        marks: 2,
        markPoints: [
          'Format check — the entry must follow the pattern DD/MM/YYYY, so 2/11/20 is rejected.',
          'Alternative: range check — the month must be between 1 and 12.',
        ],
      },
      {
        label: 'ISBN',
        prompt: 'Identify and describe a validation check that could be applied to ISBN.',
        marks: 2,
        markPoints: [
          'Check digit — the last digit is recalculated from the other digits, so a mistyped ISBN is detected.',
          'Alternative: presence check — the ISBN field must not be left blank.',
        ],
        examinerTip:
          'The question insists each check is different, so plan all three before writing. Every description must refer to the actual example data.',
      },
    ],
  },
  {
    id: 't7-q13',
    section: 's7-2',
    source: 'November 2023 · Paper 0417/12 · Q9',
    stem: 'A hospital administrator enters data from medical forms into a database. Validation and verification are both used when entering data to minimise errors.',
    parts: [
      {
        prompt: 'Explain what is meant by validation and verification and why they are both needed in this scenario.',
        marks: 6,
        markPoints: [
          'Validation is an automatic computer check that data is sensible/reasonable and meets set rules before it is accepted.',
          'Examples: a range check on a patient’s age, a presence check on a required field, a format check on a date of birth.',
          'Verification checks that the data entered matches the original source document exactly.',
          'It is carried out by visual verification or by double data entry.',
          'Validation alone is not enough: a wrongly typed but reasonable value — the wrong dosage or the wrong date of birth — would pass every validation rule.',
          'Verification alone is not enough either: it would faithfully copy an impossible value from a badly completed form.',
          'In a hospital an incorrect record could lead to the wrong treatment, so both checks are needed together.',
        ],
        examinerTip:
          'The marks split three ways: what validation is, what verification is, and why BOTH are needed here. The last part is the one candidates leave out.',
      },
    ],
  },
  {
    id: 't7-q14',
    section: 's7-1',
    source: 'November 2023 · Paper 0417/12 · Q10(a)',
    stem: 'The manager of the Tawara Hotel has decided to computerise the hotel’s room booking system. A systems analyst will research the current system. One item of information the analyst will need to identify is problems with the current system.',
    parts: [
      {
        prompt: 'State three other items of information that the systems analyst will need to identify.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'The inputs to the current system.',
          'The outputs from the current system.',
          'The processing done by the current system.',
          'How the current system works / the order in which tasks are carried out.',
          'The user and information requirements for the new system.',
          'The hardware and software currently in use.',
          'The file and data structures currently used.',
        ],
      },
    ],
  },
  {
    id: 't7-q15',
    section: 's7-2',
    source: 'November 2023 · Paper 0417/13 · Q1',
    stem: 'Peter needs to create a validation check for product numbers. Three examples of product numbers he needs to check are: 977135120127916, 976143148163921, 845132120651166',
    parts: [
      {
        prompt: 'Identify two validation checks he could use to check the numbers.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Length check — every product number is 15 digits long.',
          'Type check — only numeric digits are allowed.',
          'Check digit — the final digit can be recalculated from the others.',
          'Presence check — the field must not be left empty.',
        ],
      },
    ],
  },
  {
    id: 't7-q16',
    section: 's7-2',
    source: 'November 2023 · Paper 0417/13 · Q3(a)',
    stem: 'A teacher is setting up a spreadsheet to keep the accounts of a school shop. A box of Choco Bars shows: A the product name "Choco Bars", B "Contains: 50", C "Sell by: 1/4/2025", D "Special Price Only $1.20". State the most appropriate display format in the spreadsheet for each piece of data. Your answer must be different in each case.',
    parts: [
      {
        label: 'A',
        prompt: 'Choco Bars',
        marks: 1,
        markPoints: ['Text'],
      },
      {
        label: 'B',
        prompt: '50',
        marks: 1,
        markPoints: ['Integer / numeric with 0 decimal places'],
      },
      {
        label: 'C',
        prompt: '1/4/2025',
        marks: 1,
        markPoints: ['Date (DD/MM/YYYY)'],
      },
      {
        label: 'D',
        prompt: '$1.20',
        marks: 1,
        markPoints: ['Currency to 2 decimal places'],
        examinerTip:
          'The paper asks for a DISPLAY FORMAT, so include the detail — "currency to 2 decimal places" scores where a bare "number" does not.',
      },
    ],
  },
  {
    id: 't7-q17',
    section: 's7-1',
    source: 'November 2023 · Paper 0417/13 · Q10(a)',
    stem: 'A school has employed a systems analyst to help update its computerised examination system. State the methods of researching the current system that are described.',
    parts: [
      {
        label: 'i',
        prompt: 'Talking to the network manager and examinations officer about the current system.',
        marks: 1,
        markPoints: ['Interview(s)'],
      },
      {
        label: 'ii',
        prompt: 'Watching the users operating the current system.',
        marks: 1,
        markPoints: ['Observation'],
      },
      {
        label: 'iii',
        prompt: 'Forms sent out to all users to complete and return.',
        marks: 1,
        markPoints: ['Questionnaires'],
      },
    ],
  },
  {
    id: 't7-q18',
    section: 's7-2',
    source: 'November 2023 · Paper 0417/13 · Q10(b)',
    stem: 'After completing the analysis, the new system needs to be designed. One item that needs to be designed is a file structure.',
    parts: [
      {
        prompt: 'Identify three other items that would need to be designed.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'Data capture forms / input forms',
          'Screen layouts',
          'Output formats and report layouts',
          'Validation routines',
          'The test plan and test data',
          'Data / file structures such as field names, data types and field lengths',
        ],
      },
    ],
  },
  {
    id: 't7-q19',
    section: 's7-3',
    source: 'March 2024 · Paper 0417/12 · Q9',
    parts: [
      {
        prompt: 'Compare a test strategy with a test plan. Your answer should include similarities and differences.',
        marks: 6,
        markPoints: [
          'Similarity: both are produced at the design stage and both exist to make sure the system is thoroughly tested before it goes live.',
          'Similarity: both are written documents that form part of the system documentation.',
          'Similarity: both are used to find errors so the finished system is reliable.',
          'Difference: a test strategy is the overall approach — what will be tested, why, and in what order — whereas a test plan is the detailed schedule of individual tests.',
          'Difference: a test strategy is a high-level, general document, whereas a test plan lists specific test data, expected outcomes and actual outcomes.',
          'Difference: the strategy is written first and the plan is derived from it.',
          'Difference: the strategy covers the whole project and rarely changes, whereas the plan is detailed and updated as testing proceeds.',
        ],
      },
    ],
  },
  {
    id: 't7-q20',
    section: 's7-2',
    source: 'March 2024 · Paper 0417/12 · Q10',
    stem: 'A form tutor at Tawara School is producing a database about the students in his class. When the database is completed, it needs to be verified.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain the importance of visual verification.',
        marks: 2,
        markPoints: [
          'The tutor compares what is on the screen with the original source document to check the data was typed in correctly.',
          'It catches transcription errors — mistyped names, transposed digits — that validation would accept because they are still reasonable values.',
          'Incorrect student records could mean reports, letters or grades going to the wrong person, so accuracy matters.',
        ],
      },
      {
        label: 'b',
        prompt:
          'An example of the date of birth stored on the database is 15/05/2009. Describe three validation checks that could be carried out on the date of birth.',
        marks: 6,
        answerSlots: 3,
        markPoints: [
          'Format check — the entry must match the pattern DD/MM/YYYY, so 15-5-09 would be rejected.',
          'Range check — the day must be between 1 and 31 and the month between 1 and 12, so 15/13/2009 would be rejected.',
          'Length check — the entry must be exactly 10 characters long.',
          'Type check — the day, month and year must all be numeric, so no letters are accepted.',
          'Presence check — the field cannot be left blank, because every student must have a date of birth.',
        ],
        examinerTip:
          'Six marks for three checks: name the check AND describe what it does to this particular date. Three bare names score only three.',
      },
    ],
  },
];
