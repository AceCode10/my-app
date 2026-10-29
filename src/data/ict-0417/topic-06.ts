import type { Checkpoint } from './types';

/**
 * Section 6 — ICT Applications (6a and 6b).
 * A few questions in the paper's applications set belong to communication,
 * audience or the effects of IT, and are attached to those sections instead.
 */
export const topic06Checkpoints: Checkpoint[] = [
  {
    id: 't6-q1',
    section: 's6-8',
    source: 'March 2023 · Paper 0417/12 · Q5',
    stem: 'The number of people using online shopping has increased. This has led to an increase in the number of journeys for the delivery drivers.',
    parts: [
      {
        prompt: 'Describe how an expert system can be used to produce the best route for the delivery of items.',
        marks: 6,
        markPoints: [
          'The driver enters the delivery addresses and constraints through the user interface.',
          'The knowledge base holds data on roads, distances, speed limits, traffic patterns and previous deliveries.',
          'The rule base holds the IF...THEN rules built from that expert knowledge.',
          'The inference engine compares the entered data with the rules in the knowledge base.',
          'It searches for matches and works through the rules to find possible routes.',
          'Probabilities are applied to rank the routes by likely journey time or distance.',
          'The explanation system tells the driver why that route was chosen.',
          'The best route is output on screen through the user interface, and can be updated as conditions change.',
        ],
        examinerTip:
          'Six marks means naming the components — user interface, knowledge base, rule base, inference engine, explanation system — and saying what each does in THIS delivery context.',
      },
    ],
  },
  {
    id: 't6-q2',
    section: 's6-1',
    source: 'March 2023 · Paper 0417/12 · Q13',
    stem: 'People can watch a movie either by streaming or from a Blu-ray disc.',
    parts: [
      {
        prompt: 'Give two advantages of watching the movie by streaming rather than from a Blu-ray disc.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'The movie can be watched immediately — there is no need to travel to buy or rent a disc.',
          'No disc or player has to be bought or stored, so it costs less and takes no space.',
          'A far wider choice of films is available, and new titles appear at once.',
          'It can be watched on any device with an internet connection, anywhere.',
          'The file is not stored on the device, so no local storage is used.',
        ],
      },
    ],
  },
  {
    id: 't6-q3',
    section: 's6-10',
    source: 'March 2023 · Paper 0417/12 · Q16(b)',
    stem: 'A school car park is controlled by a barrier. When teachers enter the car park their number plate is read and the barrier is raised automatically. Automated Number Plate Recognition (ANPR) is used to read and check the number plate of the vehicle.',
    parts: [
      {
        prompt: 'Discuss the benefits and drawbacks of using an ANPR system.',
        marks: 6,
        markPoints: [
          'Benefit: entry is automatic, so teachers do not have to stop, find a card or type a code — the queue moves faster.',
          'Benefit: no barrier attendant is needed, saving wages.',
          'Benefit: a permanent record of which vehicles entered and when improves security.',
          'Benefit: cards cannot be lost, shared or forgotten, so only registered vehicles get in.',
          'Drawback: the system is expensive to install and maintain.',
          'Drawback: a dirty, damaged, obscured or non-standard plate may not be read, so the teacher is refused entry.',
          'Drawback: poor light, rain, snow or an unusual approach angle reduces accuracy.',
          'Drawback: a cloned or copied plate could let an unauthorised vehicle in.',
          'Drawback: storing vehicle movements raises privacy and data-protection concerns.',
        ],
      },
    ],
  },
  {
    id: 't6-q4',
    section: 's6-1',
    source: 'June 2023 · Paper 0417/11 · Q12',
    stem: 'Many media companies now provide media streaming for users to watch their television programmes.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by the term media streaming.',
        marks: 2,
        markPoints: [
          'Audio or video is sent over the internet in a continuous flow and played as it arrives.',
          'The file is not downloaded and stored on the user’s device — only a small buffer is held.',
          'It requires a constant internet connection of sufficient speed.',
        ],
      },
      {
        label: 'b',
        prompt: 'Describe the benefits and drawbacks of media streaming.',
        marks: 4,
        markPoints: [
          'Benefit: viewing starts almost immediately — there is no wait for a whole file to download.',
          'Benefit: no storage space is used on the device.',
          'Benefit: a huge library is available on demand, on any connected device, at any time.',
          'Benefit: content cannot easily be copied and redistributed, which protects copyright.',
          'Drawback: a fast, stable connection is essential — a slow one causes buffering, pixelation or dropouts.',
          'Drawback: nothing can be watched without an internet connection.',
          'Drawback: streaming uses a large amount of data, which costs money on a metered connection.',
          'Drawback: a subscription is usually needed, and content can be removed by the provider at any time.',
        ],
      },
    ],
  },
  {
    id: 't6-q5',
    section: 's6-2',
    source: 'June 2023 · Paper 0417/12 · Q13(a)',
    stem: 'Weather forecasters use computer modelling.',
    parts: [
      {
        prompt: 'Explain why computer modelling is used to forecast the weather.',
        marks: 4,
        markPoints: [
          'It processes an enormous amount of sensor data far faster than any person could.',
          'It can run "what-if" scenarios by changing variables such as temperature or pressure.',
          'A forecast is produced far more quickly, so warnings reach the public in time.',
          'It is safer and cheaper than any real-world alternative, and no equipment is put at risk.',
          'The model can be rerun many times with updated readings to improve accuracy.',
          'Results can be presented as maps, graphs and animations that are easy to understand.',
        ],
      },
    ],
  },
  {
    id: 't6-q6',
    section: 's9-1',
    source: 'June 2023 · Paper 0417/12 · Q14(a)',
    stem: 'ePublishing software is used to create an ePublication to display a school’s yearly magazine.',
    parts: [
      {
        prompt: 'Describe the characteristics of an ePublication.',
        marks: 4,
        markPoints: [
          'It is a publication produced and read in electronic form rather than printed on paper.',
          'It is read on a screen — computer, tablet, smartphone or e-reader.',
          'It can contain multimedia that paper cannot: video, sound, animation.',
          'It contains hyperlinks and interactive navigation such as a clickable contents page.',
          'The text can be searched, resized or reflowed to suit the reader.',
          'It can be updated and redistributed instantly at almost no cost.',
          'It is distributed by download or email, so there are no printing or postage costs.',
        ],
      },
    ],
  },
  {
    id: 't6-q7',
    section: 's6-9',
    source: 'June 2023 · Paper 0417/13 · Q7',
    stem: 'The retail industry uses point of sale (POS) systems.',
    parts: [
      {
        prompt: 'Discuss the benefits of using POS in the retail industry.',
        marks: 4,
        markPoints: [
          'Bar codes are scanned, so checkout is much faster and queues are shorter.',
          'Prices come from the database, so there are no keying errors and prices are consistent across the store.',
          'Stock levels are updated automatically as each item is sold, giving a real-time picture of stock.',
          'The system reorders automatically when stock falls below the reorder level, so shelves stay filled.',
          'Sales data can be analysed to see which lines sell well and to plan promotions.',
          'Fewer staff are needed at the till, and itemised receipts improve customer service.',
          'Loyalty cards can be linked so customers receive targeted offers.',
        ],
      },
    ],
  },
  {
    id: 't6-q8',
    section: 's9-1',
    source: 'November 2023 · Paper 0417/11 · Q6(a)',
    stem: 'A cricket club secretary saves a list of players as a PDF file.',
    parts: [
      {
        prompt: 'Describe two disadvantages of saving the list of players as a PDF file.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'A PDF is not easily editable, so the secretary cannot quickly update the list when players change.',
          'The data cannot be sorted, searched or analysed the way it could in a spreadsheet or database.',
          'Special software is needed to create or edit it, whereas reading it is free.',
          'The layout is fixed, so it does not reflow well on a small phone screen.',
          'The file can be larger than a plain text or CSV file.',
        ],
      },
    ],
  },
  {
    id: 't6-q9',
    section: 's9-1',
    source: 'November 2023 · Paper 0417/11 · Q6(b, c)',
    stem: 'The cricket club has a junior team for 6–8-year-old players. The secretary has produced an ePublication to attract new members to the junior team.',
    parts: [
      {
        label: 'b',
        prompt: 'State two features of an ePublication that could not appear on a paper poster.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Video clips',
          'Sound or music',
          'Animation',
          'Hyperlinks to other pages or a sign-up form',
          'Interactive buttons or a searchable index',
        ],
      },
      {
        label: 'c',
        prompt: 'Describe the features that could be used to make the ePublication attractive to a younger audience.',
        marks: 6,
        markPoints: [
          'Bright, primary colours that catch a young child’s eye.',
          'Large, simple, rounded font in a big point size, because 6–8-year-olds are still learning to read.',
          'Very little text — short sentences, simple vocabulary, with pictures carrying the meaning.',
          'Lots of large photographs or cartoon images of children playing cricket.',
          'Animations and sound effects to hold attention.',
          'Interactive elements such as games, quizzes or clickable buttons.',
          'A cartoon character or mascot the children can relate to.',
          'Keep it short so it does not exceed a young child’s attention span.',
        ],
        examinerTip:
          'Six marks — the audience is 6–8-year-olds, so every feature must be justified by their reading age and attention span, not just listed.',
      },
    ],
  },
  {
    id: 't6-q10',
    section: 's6-6',
    source: 'November 2023 · Paper 0417/11 · Q11',
    stem: 'Many Automatic Teller Machines (ATM) allow customers to print out mini statements of their bank accounts.',
    parts: [
      {
        prompt: 'Describe the inputs and processing involved in printing out a mini statement.',
        marks: 6,
        markPoints: [
          'Input: the customer inserts their card and the chip (or magnetic stripe) is read to get the account number.',
          'Input: the customer keys in their PIN on the keypad.',
          'Input: the customer selects the "mini statement" option from the on-screen menu.',
          'Processing: the account number is used to look up the customer’s record in the bank’s database.',
          'Processing: the PIN entered is compared with the encrypted PIN stored on the card or in the database.',
          'Processing: if they do not match the customer is asked again, and the card is retained after three failures.',
          'Processing: checks are made that the card is valid and has not been reported stolen or expired.',
          'Processing: the most recent transactions for that account are retrieved from the database.',
          'Processing: the transactions are formatted and sent to the ATM’s printer.',
        ],
        examinerTip:
          'The question asks for inputs AND processing — do not describe the output. A good answer alternates between the two in the order they happen.',
      },
    ],
  },
  {
    id: 't6-q11',
    section: 's6-3',
    source: 'November 2023 · Paper 0417/12 · Q7',
    stem: 'A video of a race can be recorded using a camera either on an autonomous flying vehicle (drone) or in a helicopter. A person would be needed in the helicopter to operate the camera.',
    parts: [
      {
        label: 'Advantages',
        prompt: 'Describe two advantages of using an autonomous flying vehicle (drone) to record the video of the race.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'No person is put at risk, so there is no danger to a pilot or camera operator if it crashes.',
          'A drone is much cheaper to buy, fuel and maintain than a helicopter.',
          'It can fly lower, closer and into spaces a helicopter cannot reach, giving better shots.',
          'It is quieter, so it does not disturb the competitors or spectators.',
          'It follows a pre-programmed flight path exactly, so shots are repeatable and consistent.',
        ],
      },
      {
        label: 'Disadvantages',
        prompt: 'Describe two disadvantages of using an autonomous flying vehicle (drone) to record the video of the race.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'A drone’s battery life is short, so it cannot record a long race without landing.',
          'It cannot react to something unexpected the way a human operator could.',
          'It can be blown off course by strong wind or lose its signal.',
          'Flying it may require a licence and permission, and it raises privacy concerns.',
          'A malfunction could send it into the crowd or the competitors.',
          'It carries less equipment, so image quality may be lower than a full camera rig.',
        ],
      },
    ],
  },
  {
    id: 't6-q12',
    section: 's6-9',
    source: 'November 2023 · Paper 0417/12 · Q11',
    stem: 'A clothing retailer only sells its clothes on the internet.',
    parts: [
      {
        prompt: 'Discuss the benefits and drawbacks to the clothing retailer of using internet shopping.',
        marks: 6,
        markPoints: [
          'Benefit: no high-street shops to rent, heat, light or staff, so overheads are far lower.',
          'Benefit: the retailer can sell worldwide, 24 hours a day, reaching many more customers.',
          'Benefit: stock can be held in one cheap warehouse rather than in every store.',
          'Benefit: customer data can be analysed for targeted advertising and to spot trends.',
          'Benefit: prices and stock can be changed instantly across the whole business.',
          'Drawback: customers cannot try clothes on, so the return rate is high and returns cost money to process.',
          'Drawback: a reliable website and payment system must be built and maintained, and downtime means lost sales.',
          'Drawback: delivery and packaging costs, and complaints when parcels are late or lost.',
          'Drawback: the risk of hacking and fraud, and the legal duty to protect customers’ personal data.',
          'Drawback: competition is global, so customers can compare prices easily and loyalty is low.',
        ],
        examinerTip:
          'Read the question: it asks about benefits and drawbacks to the RETAILER, not the customer. Points about customers shopping in pyjamas score nothing.',
      },
    ],
  },
  {
    id: 't6-q13',
    section: 's6-2',
    source: 'November 2023 · Paper 0417/13 · Q13',
    stem: 'A computer model can be used to design and test a bridge before it is built.',
    parts: [
      {
        prompt: 'Discuss the benefits and drawbacks of using a computer model before building a bridge.',
        marks: 6,
        markPoints: [
          'Benefit: it is far cheaper than building a physical prototype.',
          'Benefit: nobody is put in danger — the bridge can be tested to destruction safely.',
          'Benefit: "what-if" tests can change the load, wind speed or materials and see the result immediately.',
          'Benefit: extreme conditions such as an earthquake or hurricane can be simulated, which could not be arranged in reality.',
          'Benefit: the simulation runs faster than real time, so years of wear can be modelled in minutes.',
          'Benefit: faults are found and the design corrected before any money is spent on construction.',
          'Drawback: the results are only as good as the model — wrong rules or data give a misleading answer.',
          'Drawback: a real bridge may behave differently because the model cannot include every variable.',
          'Drawback: powerful hardware and specialist modelling software are expensive.',
          'Drawback: staff need training, and building an accurate model takes considerable time.',
        ],
      },
    ],
  },
  {
    id: 't6-q14',
    section: 's6-10',
    source: 'November 2023 · Paper 0417/13 · Q8(c, d)',
    stem: 'Part of a smart security system involves an automatic gate for vehicles approaching the house. There is a CCTV camera at the gate and the system has software for recognising each vehicle’s number plate.',
    parts: [
      {
        label: 'c',
        prompt: 'Explain how automatic number plate recognition (ANPR) systems work.',
        marks: 4,
        markPoints: [
          'A sensor detects the vehicle approaching and triggers the camera.',
          'The camera takes an image of the front of the vehicle, using infra-red illumination if it is dark.',
          'The image is processed to locate the number plate and improve its contrast and brightness.',
          'Each character on the plate is segmented and read using Optical Character Recognition (OCR).',
          'The resulting registration is converted into a string of text.',
          'That string is compared with the registrations held in the database of allowed vehicles.',
          'If it matches, a signal is sent to the motor and the gate opens; if not, entry is refused.',
        ],
      },
      {
        label: 'd',
        prompt: 'Describe three problems that could occur when the ANPR system reads a vehicle number plate.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'A dirty, damaged or faded plate may not be readable by the OCR software.',
          'Poor light, glare, rain, snow or fog can spoil the image.',
          'The vehicle approaching at an angle or too fast produces a blurred or distorted image.',
          'Similar-looking characters — 0 and O, 8 and B, 1 and I — can be misread.',
          'Non-standard fonts, spacing or personalised plates may not match the expected format.',
          'A plate obscured by a tow bar, bike rack or trailer cannot be seen at all.',
          'A cloned plate would open the gate for an unauthorised vehicle.',
        ],
      },
    ],
  },
  {
    id: 't6-q15',
    section: 's6-8',
    source: 'March 2024 · Paper 0417/12 · Q7',
    stem: 'An expert system is used to help to locate an underground water source.',
    parts: [
      {
        label: 'a(i)',
        prompt: 'Describe the user interface component of an expert system.',
        marks: 2,
        markPoints: [
          'It is the part the user sees and interacts with — the screen through which questions and answers pass.',
          'It asks the user questions and lets them input data, often as a series of yes/no questions.',
          'It displays the system’s conclusions, along with the probability of each and the explanation for them.',
        ],
      },
      {
        label: 'a(ii)',
        prompt: 'Describe the knowledge base component of an expert system.',
        marks: 2,
        markPoints: [
          'It is a very large database of facts gathered from human experts in the field.',
          'Here it would hold data on rock types, geological structures and previous successful and unsuccessful drilling sites.',
          'It is consulted by the inference engine and can be updated as new expert knowledge is gained.',
        ],
      },
      {
        label: 'b',
        prompt: 'Explain how an expert system is used to discover locations to drill for water.',
        marks: 4,
        markPoints: [
          'The geologist enters data about the site — rock type, terrain, readings — through the user interface.',
          'The inference engine compares that data with the facts in the knowledge base.',
          'It applies the IF...THEN rules in the rule base to reason about the site.',
          'It searches for matches and works out which locations fit the rules for underground water.',
          'Probabilities are calculated so the possible sites can be ranked by likelihood.',
          'The explanation system tells the geologist why each site was suggested.',
          'The recommended drilling locations and their probabilities are output through the user interface.',
        ],
      },
    ],
  },
  {
    id: 't6-q16',
    section: 's5-1',
    source: 'March 2024 · Paper 0417/12 · Q13',
    stem: 'Smart devices and microprocessors can monitor and control devices in the home.',
    parts: [
      {
        prompt: 'Describe, giving examples, the negative effects of using these smart devices.',
        marks: 4,
        markPoints: [
          'People take less exercise because devices such as robot vacuum cleaners do the manual work, leading to weight gain.',
          'Ready meals cooked in a microwave encourage a less healthy diet.',
          'Smart devices are always connected, so they can be hacked — a smart doorbell or camera could be watched by an intruder.',
          'They collect data about the household’s habits, which raises privacy concerns.',
          'They are expensive to buy, install and maintain, and become useless if the internet or power fails.',
          'People become over-reliant on them and lose traditional skills such as cooking or basic repairs.',
          'They are left on standby continuously, wasting electricity, and older devices are discarded, adding to e-waste.',
          'Less face-to-face contact and fewer manual jobs in the home reduce social interaction.',
        ],
        examinerTip:
          'The command word is "describe, giving examples" — every point needs a named device or situation attached to it.',
      },
    ],
  },
];
