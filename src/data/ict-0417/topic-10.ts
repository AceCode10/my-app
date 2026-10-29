import type { Checkpoint } from './types';

/** Section 10 — Communication: email and effective use of the internet. */
export const topic10Checkpoints: Checkpoint[] = [
  {
    id: 't10-q1',
    section: 's10-2',
    source: 'March 2023 · Paper 0417/12 · Q4(a)',
    stem: 'Young people use the internet for research and communication. Search engines can be used to research information on the internet.',
    parts: [
      {
        prompt: 'Describe three benefits of using a search engine to find information.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'It searches a huge number of web pages far faster than a person could browse them.',
          'Results are returned in seconds, so research takes much less time.',
          'Key words can be refined or combined to narrow the search to exactly what is needed.',
          'It finds information the user did not know existed, or did not know the address of.',
          'It is free to use and available from any internet-connected device, at any time.',
          'Results are usually ranked by relevance, so the most useful pages appear first.',
        ],
      },
    ],
  },
  {
    id: 't10-q2',
    section: 's9-2',
    source: 'March 2023 · Paper 0417/12 · Q12(b)',
    stem: 'A tennis coach is creating a presentation to explain to teenagers the basics of playing tennis. The designer needs to be aware of copyright legislation when creating the presentation.',
    parts: [
      {
        prompt: 'Explain the need for copyright legislation.',
        marks: 2,
        markPoints: [
          'It protects the work of the person who created it from being copied or used without permission.',
          'It ensures the creator is paid or credited for their work, so they keep earning from it.',
          'It stops others passing the work off as their own or profiting from it.',
          'It gives the creator legal grounds to act if the work is used illegally, which encourages people to keep creating.',
        ],
        examinerTip:
          '"Explain" needs the reason, not just the rule — say what copyright protects AND why that protection matters.',
      },
    ],
  },
  {
    id: 't10-q3',
    section: 's10-2',
    source: 'June 2023 · Paper 0417/11 · Q4(a, b)',
    parts: [
      {
        label: 'a',
        prompt: 'Describe the purpose of a web browser.',
        marks: 2,
        markPoints: [
          'It is software that lets the user access, retrieve and display web pages from the World Wide Web.',
          'It interprets the HTML sent by a web server and renders it as a readable page.',
          'It provides features such as an address bar, hyperlinks, bookmarks/favourites, history and tabs for navigating.',
        ],
      },
      {
        label: 'b',
        prompt: 'A company may use an intranet or an extranet. Describe the differences between an intranet and an extranet.',
        marks: 2,
        markPoints: [
          'An intranet is private to the organisation and only its own staff can access it, whereas an extranet also allows selected outsiders such as customers or suppliers in.',
          'An intranet is usually accessed only from inside the company network, whereas an extranet is reached from outside over the internet, normally with a login.',
          'An extranet therefore needs extra security — usernames, passwords and encryption — because it is exposed beyond the organisation.',
        ],
      },
    ],
  },
  {
    id: 't10-q4',
    section: 's10-2',
    source: 'June 2023 · Paper 0417/12 · Q4',
    stem: 'A company uses an extranet.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by an extranet.',
        marks: 2,
        markPoints: [
          'It is a private network belonging to an organisation, based on internet technology.',
          'Part of the organisation’s intranet is opened up to named external users such as customers, suppliers or partners.',
          'Those users log in from outside with a username and password, so the rest of the network stays private.',
        ],
      },
      {
        label: 'b',
        prompt: 'Describe the differences between the internet and an extranet.',
        marks: 2,
        markPoints: [
          'The internet is a global public network open to anyone, whereas an extranet is private and restricted to authorised users.',
          'The internet needs no login to browse, whereas an extranet requires a username and password.',
          'The internet holds information from countless organisations, whereas an extranet holds only one organisation’s information.',
          'Information on an extranet is controlled and verified by the organisation, whereas information on the internet is unregulated and may be inaccurate.',
        ],
      },
    ],
  },
  {
    id: 't10-q5',
    section: 's10-1',
    source: 'June 2023 · Paper 0417/13 · Q10(a)',
    stem: 'A school secretary is composing an email. She will send the email to a teacher and will copy the headteacher into the message. She can either copy the headteacher in as cc or bcc.',
    parts: [
      {
        label: 'cc',
        prompt: 'Describe what is meant by cc.',
        marks: 2,
        markPoints: [
          'cc stands for carbon copy — a copy of the email is sent to that person as well as the main recipient.',
          'Everyone who receives the email can see the cc address, so the teacher would know the headteacher was copied in.',
        ],
      },
      {
        label: 'bcc',
        prompt: 'Describe what is meant by bcc.',
        marks: 2,
        markPoints: [
          'bcc stands for blind carbon copy — a copy is sent to that person as well.',
          'The bcc address is hidden from all the other recipients, so the teacher would not know the headteacher had received it.',
          'It is used to keep recipients’ addresses private when emailing a large group.',
        ],
        examinerTip:
          'The mark is for visibility, not just the words behind the abbreviation. Always say who can and cannot see the address.',
      },
    ],
  },
  {
    id: 't10-q6',
    section: 's10-2',
    source: 'June 2023 · Paper 0417/13 · Q10(b)',
    stem: 'A teacher is considering setting up either a forum or a blog for his class to help his students with their studies.',
    parts: [
      {
        prompt: 'Describe the benefits of using a forum rather than a blog.',
        marks: 5,
        markPoints: [
          'A forum is two-way — any student can start a thread and ask their own question, whereas a blog is written by one author and others can only comment.',
          'Students can answer each other, so help arrives without waiting for the teacher.',
          'Discussions are organised into threads and topics, so a student can find the question they need quickly.',
          'Older threads stay searchable, building a growing bank of answers for future classes.',
          'A moderator can control membership and remove unsuitable posts, keeping it safe for the class.',
          'Students can use a username rather than their real name, so shy students are more willing to ask.',
          'Notifications tell students when someone replies to their thread, keeping the discussion going.',
        ],
        examinerTip:
          'Five marks means five distinct benefits. Each must be an advantage OVER a blog — describing what a forum is, without the comparison, does not score.',
      },
    ],
  },
];
