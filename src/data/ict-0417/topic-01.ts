import type { Checkpoint } from './types';

/** Section 1 — Types & Components of Computer Systems. */
export const topic01Checkpoints: Checkpoint[] = [
  {
    id: 't1-q1',
    section: 's1-1',
    source: 'March 2023 · Paper 0417/12 · Q1',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by the term software.',
        marks: 1,
        markPoints: ['Programs / instructions that tell the computer hardware what to do.'],
        examinerTip:
          'One mark only — do not waste time listing examples. "Programs that control the operation of a computer" earns the mark.',
      },
      {
        label: 'b',
        prompt: 'State the two types of software used by computers.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Application software', 'System software'],
      },
    ],
  },
  {
    id: 't1-q2',
    section: 's1-2',
    source: 'March 2023 · Paper 0417/12 · Q14',
    parts: [
      {
        prompt: 'Compare RAM and ROM. Your answer must include similarities and differences.',
        marks: 4,
        markPoints: [
          'Similarity: both are types of internal/primary memory held on chips inside the computer.',
          'Similarity: both are directly accessed by the CPU.',
          'Difference: RAM is volatile (contents lost when power is off), ROM is non-volatile (contents kept).',
          'Difference: RAM can be read from and written to; ROM can normally only be read from.',
          'Difference: RAM stores data and instructions currently in use; ROM stores the start-up instructions (e.g. BIOS / bootstrap).',
          'Difference: RAM capacity is much larger than ROM capacity, and RAM can be upgraded.',
        ],
        examinerTip:
          '"Compare" needs both similarities AND differences — an answer with only differences is capped. Write differences as paired statements ("RAM is ... whereas ROM is ...").',
      },
    ],
  },
  {
    id: 't1-q3',
    section: 's1-2',
    source: 'June 2023 · Paper 0417/11 · Q2',
    stem: 'Identify the hardware from the descriptions given.',
    parts: [
      {
        label: 'a',
        prompt: 'A volatile internal memory that stores the current instruction.',
        marks: 1,
        markPoints: ['RAM (Random Access Memory)'],
      },
      {
        label: 'b',
        prompt: 'A printed circuit board containing the CPU and other components of a computer.',
        marks: 1,
        markPoints: ['Motherboard'],
      },
      {
        label: 'c',
        prompt: 'A printed circuit board that controls the output to a monitor.',
        marks: 1,
        markPoints: ['Graphics card / video card'],
      },
      {
        label: 'd',
        prompt:
          'A printed circuit board that is installed in a computer so that the computer can be connected to a network.',
        marks: 1,
        markPoints: ['Network Interface Card (NIC)'],
      },
    ],
  },
  {
    id: 't1-q4',
    section: 's1-3',
    source: 'June 2023 · Paper 0417/11 · Q10',
    stem: 'Some people use dialogue-based user interfaces to operate their car audio system.',
    parts: [
      {
        label: 'a',
        prompt: 'Describe what is meant by a dialogue-based user interface.',
        marks: 2,
        markPoints: [
          'The user speaks commands to the device / uses their voice to control it.',
          'The device recognises the spoken words and carries out the instruction.',
          'The system may reply with speech, creating a two-way conversation.',
        ],
      },
      {
        label: 'b',
        prompt: 'Describe the benefits and drawbacks of using a dialogue-based user interface in this way.',
        marks: 4,
        markPoints: [
          'Benefit: the driver does not need to take their hands off the wheel, so it is safer.',
          'Benefit: the driver does not need to look away from the road, and need not learn menus or button positions.',
          'Benefit: useful for users with a physical disability who cannot press buttons or use a touch screen.',
          'Drawback: background noise in the car can stop the system recognising commands.',
          'Drawback: accents, dialects or a sore throat can cause words to be misinterpreted.',
          'Drawback: the range of commands understood is limited compared with a full menu of options.',
        ],
        examinerTip: 'Answer in context — the question says "in this way", so tie every point to driving a car.',
      },
    ],
  },
  {
    id: 't1-q6',
    section: 's1-2',
    source: 'November 2023 · Paper 0417/11 · Q9',
    stem: "Rowena's laptop computer contains a small capacity Solid State Drive (SSD) of 32Gb and a large capacity Hard Disk Drive (HDD) of 1024Gb.",
    parts: [
      {
        label: 'a(i)',
        prompt: 'State, giving a reason for your choice, a use for the SSD in the laptop computer.',
        marks: 2,
        markPoints: [
          'Use: store the operating system and frequently used application software.',
          'Reason: the SSD has much faster access times, so the laptop boots and loads programs quickly.',
          'Reason: the SSD has no moving parts, so it is more robust and uses less power in a portable device.',
        ],
      },
      {
        label: 'a(ii)',
        prompt:
          'State, giving a reason for your choice, a use for the HDD in the laptop computer. Your answers must be different in each case.',
        marks: 2,
        markPoints: [
          'Use: store large data files such as videos, photographs or backups.',
          'Reason: the HDD has a much larger capacity (1024 Gb against 32 Gb).',
          'Reason: the cost per gigabyte of an HDD is much lower.',
        ],
      },
      {
        label: 'b',
        prompt: 'The laptop computer also contains internal memory. Give two examples of internal memory.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['RAM (Random Access Memory)', 'ROM (Read-Only Memory)'],
      },
    ],
  },
  {
    id: 't1-q7',
    section: 's1-1',
    source: 'November 2023 · Paper 0417/12 · Q2',
    stem: 'A computer system uses both analogue and digital data.',
    optionList: [
      'analogue data',
      'digital data',
      'display a graph on a monitor',
      'input the maximum safe water level for a river',
      'measure acidity levels in a river',
      'control humidity levels',
      'open the windows in a greenhouse',
    ],
    parts: [
      {
        label: 'a(i)',
        prompt: 'Explain what is meant by analogue data.',
        marks: 1,
        markPoints: [
          'Data that varies continuously and can take any value within a range (e.g. a sound wave or a temperature).',
        ],
      },
      {
        label: 'a(ii)',
        prompt: 'Explain what is meant by digital data.',
        marks: 1,
        markPoints: ['Data made up of discrete values, represented in binary as 0s and 1s.'],
      },
      {
        label: 'b',
        prompt:
          'Digital data is processed in a computer system. Sometimes digital data needs to be converted to analogue data. Explain why digital data may need to be converted to analogue data.',
        marks: 1,
        markPoints: [
          'Physical devices such as speakers, motors and actuators only respond to analogue signals, so a DAC converts the output for them.',
        ],
      },
      {
        label: 'c(i)',
        prompt:
          'Use the most appropriate phrase from the list to complete the sentence. Your answer must be different in each case. "A motor is used to ..."',
        marks: 1,
        markPoints: ['open the windows in a greenhouse'],
      },
      {
        label: 'c(ii)',
        prompt: '"A DAC outputs ..."',
        marks: 1,
        markPoints: ['analogue data'],
      },
      {
        label: 'c(iii)',
        prompt: '"A sensor is used to ..."',
        marks: 1,
        markPoints: ['measure acidity levels in a river'],
      },
    ],
  },
  {
    id: 't1-q8',
    section: 's1-4',
    source: 'November 2023 · Paper 0417/12 · Q5',
    stem: 'A group of pupils is planning to create a newsletter for a history project. The group can either use a smartphone or a phablet computer.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by a phablet computer.',
        marks: 2,
        markPoints: [
          'A device that combines the features of a smartphone and a tablet.',
          'Its screen is larger than a smartphone but smaller than a tablet.',
          'It can make phone calls as well as run tablet applications, and uses a touch screen with an on-screen keyboard.',
        ],
      },
      {
        label: 'b',
        prompt:
          'Discuss the advantages and disadvantages of using a phablet computer rather than a smartphone for this project.',
        marks: 6,
        markPoints: [
          'Advantage: the larger screen makes it easier to see the newsletter layout and spot formatting errors.',
          'Advantage: the larger on-screen keyboard makes typing long articles faster and more accurate.',
          'Advantage: more processing power and memory, so desktop publishing apps run better.',
          'Advantage: easier for several pupils to view the work at the same time.',
          'Disadvantage: a phablet is larger and heavier, so it is less portable around school.',
          'Disadvantage: a phablet is usually more expensive than a smartphone.',
          'Disadvantage: the larger screen drains the battery more quickly.',
          'Disadvantage: pupils are more likely to already own a smartphone, so no extra device is needed.',
        ],
        examinerTip:
          '"Discuss" is a 6-mark extended answer. Give roughly three advantages and three disadvantages, keep every point in the context of producing a newsletter, and finish with a short conclusion.',
      },
    ],
  },
  {
    id: 't1-q9',
    section: 's1-4',
    source: 'November 2023 · Paper 0417/12 · Q6',
    stem: 'Many teachers use multimedia projectors in their lessons.',
    parts: [
      {
        label: 'a',
        prompt: 'State two health issues associated with the use of multimedia projectors.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Eye strain or headaches from looking at the bright projector lamp or beam.',
          'Damage to eyesight from staring directly into the lens.',
          'Back or neck problems from poor posture when turning to view the screen.',
          'Hearing damage if the speakers are used at high volume.',
        ],
      },
      {
        label: 'b',
        prompt: 'State two safety issues associated with the use of multimedia projectors.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Trailing power or video cables can cause someone to trip.',
          'The projector and its lamp get very hot and can cause burns.',
          'A ceiling- or shelf-mounted projector could fall and injure someone.',
          'Overloaded sockets or damaged cables can cause fire or electrocution.',
        ],
        examinerTip:
          'Health issues harm the body over time (eye strain, RSI, back problems). Safety issues cause immediate injury (trip, burn, electrocution, fire). Mixing the two loses marks.',
      },
    ],
  },
  {
    id: 't1-q10',
    section: 's1-5',
    source: 'November 2023 · Paper 0417/13 · Q7(a)',
    stem: 'Rockit Aircraft manufactures and flies aeroplanes. The pilots at Rockit Aircraft are trained using extended reality.',
    parts: [
      {
        prompt: 'Describe what is meant by extended reality.',
        marks: 2,
        markPoints: [
          'Extended reality (XR) is the umbrella term for technologies that combine the real and the virtual world.',
          'It covers virtual reality (VR), augmented reality (AR) and mixed reality (MR).',
          'It uses computer-generated images, often through a headset, to create an immersive or overlaid environment the user can interact with.',
        ],
      },
    ],
  },
  {
    id: 't1-q11',
    section: 's1-1',
    source: 'March 2024 · Paper 0417/12 · Q2',
    stem: 'A computer system consists of both hardware and software.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what the following types of software provide in the computer system: Applications, System.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Applications software provides the services that let the user carry out a specific task.',
          'System software provides the services the computer itself needs in order to operate.',
        ],
      },
      {
        label: 'b(i)',
        prompt: 'Give two examples of applications software.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Word processor',
          'Spreadsheet',
          'Database management software',
          'Graphics or photo editing software',
          'Video or audio editing software',
          'Web browser, CAD, control or measurement software',
        ],
      },
      {
        label: 'b(ii)',
        prompt: 'Give two examples of system software.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Operating system',
          'Compiler',
          'Linker',
          'Device driver',
          'Utility software (e.g. antivirus, disk defragmenter)',
        ],
        examinerTip: 'Give the type of software, not a brand name — "word processor", not "Word".',
      },
    ],
  },
  {
    id: 't1-q12',
    section: 's1-1',
    source: 'March 2024 · Paper 0417/12 · Q3',
    stem: 'There are two forms of data: analogue and digital.',
    parts: [
      {
        prompt: 'Contrast analogue and digital data.',
        marks: 4,
        markPoints: [
          'Analogue data varies continuously, whereas digital data changes in discrete steps.',
          'Analogue data can take any value in a range, whereas digital data is limited to set values represented in binary.',
          'Analogue data comes from real-world physical signals (sound, temperature, light), whereas digital data is the form a computer processes directly.',
          'Analogue signals pick up noise and degrade when copied or transmitted, whereas digital signals can be reproduced exactly.',
          'An ADC is needed to turn analogue into digital for input, and a DAC to turn digital back into analogue for output.',
        ],
        examinerTip:
          '"Contrast" means differences only — write paired statements using "whereas". Similarities earn nothing here.',
      },
    ],
  },
  {
    id: 't1-q13',
    section: 's1-2',
    source: 'March 2024 · Paper 0417/12 · Q4',
    stem: 'Computers contain a Central Processing Unit (CPU).',
    parts: [
      {
        prompt: 'Describe the role of the CPU in processing instructions to produce an output.',
        marks: 4,
        markPoints: [
          'The CPU fetches the instruction from memory (RAM).',
          'The instruction is decoded so the CPU knows which operation to carry out.',
          'The instruction is executed — the ALU performs the calculation or logical comparison.',
          'The control unit manages and coordinates the operations and the flow of data to and from input/output devices.',
          'Registers hold the data and instructions currently being worked on.',
          'The result is stored or sent to an output device to produce the output, and the cycle repeats.',
        ],
        examinerTip:
          'Use the fetch–decode–execute cycle as your structure; it makes four clear marking points easy to hit.',
      },
    ],
  },
  {
    id: 't1-q14',
    section: 's1-3',
    source: 'March 2024 · Paper 0417/12 · Q5',
    stem: 'A doctor uses a gesture-based user interface.',
    parts: [
      {
        prompt: 'State two other types of user interface.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Command Line Interface (CLI)',
          'Graphical User Interface (GUI)',
          'Dialogue-based / voice interface',
        ],
        examinerTip: '"Other" rules out gesture-based, so only three answers are available.',
      },
    ],
  },
  {
    id: 't1-q15',
    section: 's1-5',
    source: 'March 2024 · Paper 0417/12 · Q6',
    stem: 'Augmented Reality can be used with a Global Positioning System (GPS) device.',
    parts: [
      {
        label: 'a',
        prompt: 'State two other uses of Augmented Reality.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Previewing furniture or paint colours in a room before buying.',
          'Trying on clothes, glasses or make-up virtually when shopping online.',
          'Overlaying instructions on machinery for maintenance or training.',
          'AR games that place characters in the real world.',
          'Displaying player or event information over a live sports broadcast.',
          'Surgeons viewing scan data overlaid on a patient during an operation.',
        ],
      },
      {
        label: 'b',
        prompt: 'Describe the differences between Augmented Reality and Virtual Reality.',
        marks: 2,
        markPoints: [
          'AR adds computer-generated images on top of the real world, whereas VR replaces the real world entirely with a computer-generated one.',
          'In AR the user can still see and interact with their real surroundings, whereas in VR the user is fully immersed and cut off from them.',
          'AR usually runs on a phone, tablet or smart glasses, whereas VR normally needs a headset that blocks out the outside view.',
        ],
      },
    ],
  },
];
