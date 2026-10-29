import type { Checkpoint } from './types';

/**
 * Section 9 — Audience and Copyright. One question in the paper's audience set
 * is really about direct data entry, so it sits with the input-devices section.
 */
export const topic09Checkpoints: Checkpoint[] = [
  {
    id: 't9-q1',
    section: 's9-1',
    source: 'March 2023 · Paper 0417/12 · Q12(a)',
    stem: 'A tennis coach is creating a presentation to explain to teenagers the basics of playing tennis.',
    parts: [
      {
        prompt: 'Describe the design features that must be included to make the presentation appeal to the teenagers.',
        marks: 4,
        markPoints: [
          'Use bright, bold colours and a modern colour scheme rather than a formal one.',
          'Keep text short — bullet points rather than paragraphs — with a large, clear, informal font.',
          'Include plenty of images, video clips or animations of tennis being played.',
          'Add sound or music to hold attention.',
          'Use language and vocabulary suited to teenagers, avoiding technical jargon.',
          'Make it interactive — quizzes, hyperlinks or buttons the teenagers can click.',
          'Keep the presentation short so it holds their attention span.',
        ],
        examinerTip:
          'Every point must be a design feature tied to the audience. "It should look nice" earns nothing; "large informal font because teenagers are put off by dense text" does.',
      },
    ],
  },
  {
    id: 't9-q2',
    section: 's9-2',
    source: 'June 2023 · Paper 0417/12 · Q14(b)',
    stem: 'ePublishing software is used to create an ePublication to display a school’s yearly magazine. The ePublishing software is subject to software copyright legislation.',
    parts: [
      {
        prompt: 'Give two methods that could be used to prevent software copyright legislation being broken.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Require a unique product key / licence key to be entered during installation.',
          'Require the software to be registered and activated online before it will run.',
          'Use a dongle or hardware key that must be plugged in for the software to work.',
          'Check the original CD/DVD is in the drive while the software runs.',
          'Encrypt the installation media so it cannot simply be copied.',
          'Include a licence agreement the user must accept, limiting the number of installations.',
        ],
        examinerTip: 'Give prevention methods, not punishments — "take them to court" is not a method of prevention.',
      },
    ],
  },
  {
    id: 't9-q3',
    section: 's9-1',
    source: 'June 2023 · Paper 0417/13 · Q3(d)',
    stem: 'A group of students are producing a class newsletter which they will email to parents of students in the class.',
    parts: [
      {
        prompt: 'Describe the features that the students must include to make the newsletter appeal to the parents.',
        marks: 4,
        markPoints: [
          'Use a formal, professional tone and standard English with no slang.',
          'Use a clear, plain serif or sans-serif font at a readable size — larger text suits older readers.',
          'Use a conservative colour scheme rather than bright, garish colours.',
          'Organise the content in columns with clear headings so it is easy to scan.',
          'Include photographs of the students and school events that parents will recognise.',
          'Include information parents actually need — dates, events, achievements and contact details.',
          'Keep it concise so a busy parent can read it quickly.',
        ],
      },
    ],
  },
  {
    id: 't9-q4',
    section: 's2-2',
    source: 'November 2023 · Paper 0417/12 · Q4',
    stem: 'A headteacher is considering setting up a card system for students to buy food in the school canteen. The headteacher is trying to decide whether to install a system that uses magnetic stripe card readers or one that uses chip and PIN card readers.',
    parts: [
      {
        prompt:
          'Compare the use of magnetic stripe card readers with the use of chip and PIN card readers. Your answer must include similarities and differences.',
        marks: 6,
        markPoints: [
          'Similarity: both are direct data entry devices that read data automatically from a card.',
          'Similarity: both are far faster and more accurate than typing the student’s details in by hand.',
          'Similarity: both link to a database that holds the student’s account balance.',
          'Difference: a magnetic stripe card is swiped, whereas a chip and PIN card is inserted into the reader.',
          'Difference: chip and PIN requires the student to enter a PIN, so it is more secure if the card is stolen.',
          'Difference: magnetic stripes wear out, can be scratched and are erased by magnetic fields, so they fail more often.',
          'Difference: a magnetic stripe is easier to clone, whereas the chip is encrypted and very difficult to copy.',
          'Difference: magnetic stripe readers are cheaper to buy and the cards cost less to produce.',
          'Difference: swiping is quicker at a busy canteen till because no PIN has to be typed.',
        ],
        examinerTip:
          'A 6-mark "compare" needs both similarities and differences. Keep it in the canteen context — queue speed, lost cards and cost all matter to a school.',
      },
    ],
  },
  {
    id: 't9-q5',
    section: 's9-1',
    source: 'November 2023 · Paper 0417/13 · Q9(a)',
    stem: 'The secretary of Tawara University has created web pages for former students. The former students are adults.',
    parts: [
      {
        prompt: 'State the design features of the web pages that would meet the needs of this target audience.',
        marks: 6,
        answerSlots: 6,
        markPoints: [
          'A formal, professional tone with standard English and no slang.',
          'A plain, readable font at a size that suits older eyes, with good contrast against the background.',
          'A subdued, consistent colour scheme using the university’s branding.',
          'Clear, consistent navigation — a menu on every page and a site map.',
          'Content relevant to alumni: reunions, news, donations, careers and contact details.',
          'Photographs of the university and past events rather than animations or sound.',
          'Accessibility features such as alt text and the ability to enlarge the text.',
          'Fast-loading pages that work on a range of devices and connection speeds.',
        ],
        examinerTip:
          'Six separate features for six marks. Adults are not teenagers — no loud colours, music or slang.',
      },
    ],
  },
  {
    id: 't9-q6',
    section: 's9-1',
    source: 'March 2024 · Paper 0417/12 · Q15',
    stem: 'The audience needs to be considered when creating an ICT solution.',
    parts: [
      {
        label: 'a',
        prompt: 'Describe what factors need to be considered for the age of the audience.',
        marks: 2,
        markPoints: [
          'Young children need simple vocabulary, large text, bright colours, pictures and sound.',
          'Adults need a more formal tone, plain colours and more detailed written information.',
          'Older users may need larger text and higher contrast for readability.',
          'The reading age and attention span of the audience determine how much text to use.',
        ],
      },
      {
        label: 'b',
        prompt: 'Describe what factors need to be considered for the interests of the audience.',
        marks: 2,
        markPoints: [
          'The content must cover the subjects the audience actually cares about, or they will not engage.',
          'Images, examples and vocabulary should be drawn from that interest area.',
          'The level of expertise matters — specialists expect technical terms, beginners need them explained.',
          'The house style and tone should match what that audience is used to seeing.',
        ],
      },
    ],
  },
];
