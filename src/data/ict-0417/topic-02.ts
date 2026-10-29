import type { Checkpoint } from './types';

/**
 * Section 2 — Input and Output Devices.
 * The paper's input/output set also carries questions on device choice and
 * Bluetooth, which are attached to the sections that teach them.
 */
export const topic02Checkpoints: Checkpoint[] = [
  {
    id: 't2-q1',
    section: 's2-3',
    source: 'March 2023 · Paper 0417/12 · Q2',
    stem: 'Tick the device which produces hard copy.',
    optionList: ['A Buzzer', 'B Laser printer', 'C Touch screen', 'D Webcam'],
    parts: [
      {
        prompt: 'Which device produces hard copy, and why?',
        marks: 1,
        markPoints: [
          'B — laser printer. Hard copy is a permanent printed output on paper; the others produce sound, soft copy on screen, or are input devices.',
        ],
      },
    ],
  },
  {
    id: 't2-q2',
    section: 's4-1',
    source: 'March 2023 · Paper 0417/12 · Q6',
    stem: 'Bluetooth is a method of wireless communication.',
    parts: [
      {
        prompt: 'State two devices found in the home which could be connected via Bluetooth.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Wireless headphones or earbuds',
          'A wireless speaker',
          'A wireless keyboard or mouse',
          'A smartphone or tablet',
          'A smart watch or fitness tracker',
          'A games controller',
          'A wireless printer',
        ],
      },
    ],
  },
  {
    id: 't2-q3',
    section: 's2-1',
    source: 'March 2023 · Paper 0417/12 · Q10',
    stem: 'Some computers have touch screens.',
    parts: [
      {
        prompt: 'Describe three benefits of using a touch screen.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'Input is fast — the user taps the option directly instead of moving a mouse to it.',
          'It is intuitive and needs little training, so it suits young children and inexperienced users.',
          'No separate keyboard or mouse is needed, so the device is smaller and more portable.',
          'The screen is easy to clean and there are no keys for dirt to get under, which suits public kiosks.',
          'The on-screen options can change with the task, so the same screen serves many purposes.',
          'It helps users who find a mouse difficult to control.',
        ],
      },
    ],
  },
  {
    id: 't2-q4',
    section: 's2-1',
    source: 'March 2023 · Paper 0417/12 · Q16(a)',
    stem: 'A school car park is controlled by a barrier. When teachers enter the car park their number plate is read and the barrier is raised automatically. The diagram shows a camera, a microphone, a keypad, a speaker, a pressure sensor and a motor. Visitors can use the keypad as an input device to enter a code which allows the barrier to be raised.',
    parts: [
      {
        prompt: 'Identify three other input devices shown in the diagram.',
        marks: 3,
        answerSlots: 3,
        markPoints: ['Camera', 'Microphone', 'Pressure sensor'],
        examinerTip:
          'The speaker and the motor are OUTPUT devices, and the keypad is ruled out by the word "other" — only three answers are available.',
      },
    ],
  },
  {
    id: 't2-q5',
    section: 's2-2',
    source: 'June 2023 · Paper 0417/11 · Q8',
    parts: [
      {
        label: 'a',
        prompt:
          'Compare Optical Mark Readers (OMRs) with Optical Character Readers (OCRs). Your answer must include similarities and differences.',
        marks: 6,
        markPoints: [
          'Similarity: both are direct data entry devices that read data from paper optically, without it being typed in.',
          'Similarity: both are much faster and more accurate than manual data entry of large volumes.',
          'Similarity: both shine light at the document and detect the reflection.',
          'Difference: an OMR detects the position of marks (pencil marks in boxes), whereas an OCR reads the shapes of the characters themselves.',
          'Difference: an OMR cannot read text — it only knows which box was filled — whereas an OCR converts printed or handwritten text into editable characters.',
          'Difference: OMR is highly accurate because it only detects a mark, whereas OCR often misreads characters, especially handwriting.',
          'Difference: OMR requires a specially printed form, whereas an OCR can read an ordinary document.',
          'Difference: OMR is used for multiple-choice tests and questionnaires; OCR is used for passport readers and digitising printed documents.',
        ],
        examinerTip:
          'Six marks and the paper says similarities AND differences — plan two similarities before you start writing the differences.',
      },
      {
        label: 'b',
        prompt: 'Identify two uses of Optical Mark Recognition (OMR).',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Marking multiple-choice examination answer sheets',
          'Reading questionnaires or surveys',
          'Reading school registers',
          'Reading lottery tickets or voting papers',
        ],
      },
    ],
  },
  {
    id: 't2-q6',
    section: 's1-2',
    source: 'June 2023 · Paper 0417/12 · Q2',
    stem: 'Identify the most appropriate hardware from the descriptions given.',
    parts: [
      {
        label: 'a',
        prompt: 'Non-volatile internal memory used to store the start-up instructions.',
        marks: 1,
        markPoints: ['ROM (Read-Only Memory)'],
      },
      {
        label: 'b',
        prompt: 'An internal component that provides the input and output of audio signals.',
        marks: 1,
        markPoints: ['Sound card'],
      },
      {
        label: 'c',
        prompt: 'An internal component that is composed of the main memory, the control unit and the arithmetic logic unit.',
        marks: 1,
        markPoints: ['Central Processing Unit (CPU) / processor'],
      },
    ],
  },
  {
    id: 't2-q7',
    section: 's2-1',
    source: 'June 2023 · Paper 0417/12 · Q3',
    stem: 'A headteacher is producing a web page about the history of her school. She has been given some old hard-copy photographs which she will include on the web page. She has a digital camera and a scanner to use to convert the hard-copy photographs into a digital format.',
    parts: [
      {
        prompt: 'Compare the use of a digital camera with a scanner in this scenario. Your answer must include similarities and differences.',
        marks: 4,
        markPoints: [
          'Similarity: both are input devices that produce a digital image file which can be placed on the web page.',
          'Similarity: both allow the image to be edited afterwards in graphics software.',
          'Difference: the scanner produces a higher-quality, more consistent copy because the photograph lies flat and is evenly lit.',
          'Difference: a camera shot can suffer from glare, shadow, blur or distortion if the photograph is not held square.',
          'Difference: the camera is far quicker, especially for a large pile of photographs, and is portable.',
          'Difference: a scanner needs the photograph to fit on its glass plate, so very large photographs cannot be scanned in one pass.',
          'Difference: a scanner can be used with OCR software to capture any writing on the back of the photograph.',
        ],
      },
    ],
  },
  {
    id: 't2-q8',
    section: 's2-2',
    source: 'June 2023 · Paper 0417/12 · Q9',
    stem: 'The products in a warehouse contain either a bar code or a Radio Frequency Identification (RFID) tag. The data about each product is read electronically.',
    parts: [
      {
        label: 'a',
        prompt: 'Compare bar code readers and RFID readers. Your answer must include similarities and differences.',
        marks: 6,
        markPoints: [
          'Similarity: both are direct data entry devices that read a product’s data automatically into the computer.',
          'Similarity: both are faster and more accurate than typing product codes in by hand.',
          'Similarity: both look the data up in a database to find the product details.',
          'Difference: a bar code reader uses a laser or LED light, whereas an RFID reader uses radio waves.',
          'Difference: a bar code must be in line of sight and close to the reader, whereas an RFID tag can be read through packaging and from a distance.',
          'Difference: an RFID reader can read many tags at once — a whole pallet — whereas a bar code reader reads one at a time.',
          'Difference: bar codes are read-only, whereas RFID tags can often be written to as well.',
          'Difference: bar codes are very cheap to print, whereas RFID tags and readers cost considerably more.',
          'Difference: a bar code is easily damaged, creased or dirtied and then will not scan, whereas an RFID tag is more robust.',
        ],
      },
      {
        label: 'b',
        prompt: 'Identify two other uses of RFID.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Contactless payment cards',
          'Passports and ID cards',
          'Livestock or pet tagging',
          'Library book tracking',
          'Automatic road toll or car park barriers',
          'Tracking luggage at an airport',
          'Staff or student ID badges for building access',
        ],
      },
    ],
  },
  {
    id: 't2-q9',
    section: 's2-2',
    source: 'June 2023 · Paper 0417/12 · Q13(b)',
    stem: 'Weather forecasters use computer modelling. Data is collected by different types of sensor and then input to the computer model to be processed.',
    parts: [
      {
        prompt: 'Identify two sensors that could be used to collect weather data.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Temperature sensor',
          'Humidity / moisture sensor',
          'Pressure sensor',
          'Light sensor',
          'Rain / water level sensor',
          'Wind speed sensor (anemometer)',
        ],
      },
    ],
  },
  {
    id: 't2-q10',
    section: 's2-3',
    source: 'June 2023 · Paper 0417/12 · Q13(c)',
    stem: 'The processed weather data is then output.',
    parts: [
      {
        prompt: 'Identify two output devices that could be used.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Monitor / screen', 'Printer', 'Speaker', 'Multimedia projector', 'Plotter'],
      },
    ],
  },
  {
    id: 't2-q11',
    section: 's2-1',
    source: 'June 2023 · Paper 0417/13 · Q2(b, c)',
    stem: 'Identify the most appropriate hardware from the descriptions given.',
    parts: [
      {
        label: 'b',
        prompt: 'An external device that retains a computer’s data even after the computer is turned off.',
        marks: 1,
        markPoints: ['External / portable hard disk drive (or memory stick / pen drive)'],
      },
      {
        label: 'c',
        prompt: 'An input device that is attached to a monitor.',
        marks: 1,
        markPoints: ['Touch screen'],
      },
    ],
  },
  {
    id: 't2-q12',
    section: 's1-4',
    source: 'June 2023 · Paper 0417/13 · Q3(a)',
    stem: 'A group of students are producing a class newsletter which they will email to parents of students in the class. They are deciding whether to use a laptop computer or a smartphone to type the newsletter.',
    parts: [
      {
        prompt: 'Discuss the advantages and disadvantages of using a laptop computer rather than a smartphone for this purpose.',
        marks: 6,
        markPoints: [
          'Advantage: a full-size physical keyboard makes typing long articles much faster and more accurate.',
          'Advantage: the larger screen shows the whole page layout, so columns and images can be positioned properly.',
          'Advantage: more processing power and memory, so full desktop-publishing software can be used.',
          'Advantage: more storage for the images, and easier connection to a printer or scanner.',
          'Disadvantage: a laptop is heavier and less portable than a smartphone the students already carry.',
          'Disadvantage: a laptop is more expensive, and the students may not each own one.',
          'Disadvantage: battery life is shorter under heavy use and it needs a desk to work at.',
          'Disadvantage: photographs taken on a phone must be transferred to the laptop first.',
        ],
        examinerTip:
          'Six marks: about three advantages and three disadvantages, all framed around typing and laying out a newsletter.',
      },
    ],
  },
  {
    id: 't2-q13',
    section: 's2-1',
    source: 'June 2023 · Paper 0417/13 · Q3(b)',
    stem: 'The students have decided to use a smartphone. Data for the newsletter will be input, stored and output by the smartphone.',
    parts: [
      {
        label: 'b(i)',
        prompt: 'Identify two devices that are part of the smartphone that could be used to input the data for the newsletter.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Touch screen / on-screen keyboard', 'Camera', 'Microphone', 'Sensors such as GPS'],
      },
      {
        label: 'b(ii)',
        prompt: 'Identify two devices that are part of the smartphone that could be used to output data from the newsletter.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Screen / display', 'Speaker', 'Headphone socket or Bluetooth audio output'],
      },
      {
        label: 'b(iii)',
        prompt: 'Identify two appropriate devices that could be used to store data for the newsletter.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'The phone’s internal solid-state storage / flash memory',
          'An SD or microSD memory card',
          'Cloud storage',
          'A memory stick / pen drive',
        ],
      },
    ],
  },
  {
    id: 't2-q14',
    section: 's10-1',
    source: 'June 2023 · Paper 0417/13 · Q3(c)',
    stem: 'The newsletter is to be saved as a PDF and sent as an email attachment to parents.',
    parts: [
      {
        prompt: 'Describe two benefits of saving the newsletter as a PDF.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'The layout, fonts and images look the same on every device, whatever software the parent has.',
          'A PDF can be opened on almost any device with a free reader, so no special software is needed.',
          'The file is normally read-only, so parents cannot accidentally alter the newsletter.',
          'PDFs compress well, so the attachment is small enough to email easily.',
          'It can be password protected or digitally signed if needed.',
        ],
      },
    ],
  },
  {
    id: 't2-q15',
    section: 's2-2',
    source: 'November 2023 · Paper 0417/11 · Q2',
    stem: 'State the most appropriate word or phrase to complete each sentence.',
    parts: [
      {
        label: 'a',
        prompt: 'The type of data output from a sensor is ...',
        marks: 1,
        markPoints: ['Analogue'],
      },
      {
        label: 'b',
        prompt: 'The type of data read by a microprocessor is ...',
        marks: 1,
        markPoints: ['Digital'],
      },
      {
        label: 'c',
        prompt: 'The item of hardware that converts data from a sensor so a microprocessor can read it is ...',
        marks: 1,
        markPoints: ['An ADC (Analogue-to-Digital Converter)'],
      },
      {
        label: 'd',
        prompt: 'The type of sensor that is used in a refrigerator is ...',
        marks: 1,
        markPoints: ['A temperature sensor'],
      },
    ],
  },
  {
    id: 't2-q16',
    section: 's1-4',
    source: 'November 2023 · Paper 0417/11 · Q3(a)',
    stem: 'A group of students are carrying out a study of the quality of river water for a project. They can either use a tablet computer or a smartphone to monitor and record their findings.',
    parts: [
      {
        prompt: 'Discuss the advantages and disadvantages of using a tablet computer rather than a smartphone for this project.',
        marks: 6,
        markPoints: [
          'Advantage: the larger screen makes it easier to read sensor readings, graphs and tables outdoors.',
          'Advantage: a larger on-screen keyboard makes recording written observations faster and more accurate.',
          'Advantage: more processing power, memory and storage for data logging and analysis software.',
          'Advantage: longer battery life than a smartphone for a full day in the field.',
          'Advantage: easier for several students to view the data together at the riverbank.',
          'Disadvantage: a tablet is bigger and heavier to carry along a river, and easier to drop.',
          'Disadvantage: it is more expensive to replace if damaged or dropped in the water.',
          'Disadvantage: fewer tablets have mobile data or GPS built in, and students are more likely to own a phone already.',
        ],
      },
    ],
  },
  {
    id: 't2-q17',
    section: 's2-1',
    source: 'November 2023 · Paper 0417/11 · Q3(b)',
    parts: [
      {
        prompt: 'Identify two devices that could be used by the students to enter data.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Touch screen / on-screen keyboard',
          'A sensor (pH, temperature, turbidity) connected to the device',
          'Camera',
          'Microphone (for voice notes)',
          'A stylus or digital pen',
        ],
      },
    ],
  },
  {
    id: 't2-q18',
    section: 's1-1',
    source: 'November 2023 · Paper 0417/12 · Q1',
    stem: 'Tick one external device.',
    optionList: ['A sound card', 'B pen drive', 'C motherboard', 'D ROM'],
    parts: [
      {
        prompt: 'Which is the external device, and why?',
        marks: 1,
        markPoints: [
          'B — pen drive. It plugs in outside the computer case; the sound card, motherboard and ROM are all internal hardware.',
        ],
      },
    ],
  },
  {
    id: 't2-q19',
    section: 's2-2',
    source: 'November 2023 · Paper 0417/13 · Q3(b)',
    stem: 'A teacher is setting up a spreadsheet to keep the accounts of a school shop. Each box delivered to the school shop includes a QR code.',
    parts: [
      {
        prompt: 'Explain why QR codes are used.',
        marks: 4,
        markPoints: [
          'A QR code stores much more data than a bar code because it is read in two dimensions.',
          'It can hold text, a web address, product details or contact information.',
          'It is scanned quickly by an ordinary smartphone camera, so no special reader is needed.',
          'Data entry is automatic, so it is far faster and more accurate than typing the details in.',
          'It can be read from any angle, and still scans correctly when partly damaged or dirty because of built-in error correction.',
          'It is cheap to print onto the box.',
        ],
      },
    ],
  },
  {
    id: 't2-q20',
    section: 's2-3',
    source: 'November 2023 · Paper 0417/13 · Q7(b)',
    stem: 'Rockit Aircraft manufactures and flies aeroplanes. Some of the components used in the manufacture of aircraft are produced using a 3D printer.',
    parts: [
      {
        prompt: 'Analyse the use of a 3D printer to make the components rather than making the components by hand.',
        marks: 6,
        markPoints: [
          'Advantage: every component is identical, so quality is consistent and parts fit exactly.',
          'Advantage: complex shapes that could not be made by hand can be produced in one piece.',
          'Advantage: prototypes can be produced quickly, tested and redesigned, speeding up development.',
          'Advantage: it works unattended around the clock, so fewer skilled staff are needed and labour costs fall.',
          'Advantage: components are built up layer by layer, so there is much less waste material.',
          'Disadvantage: the printers and their materials are very expensive to buy and maintain.',
          'Disadvantage: printing each part can be slow compared with mass production methods.',
          'Disadvantage: staff need training in CAD and in operating the printer, and skilled jobs may be lost.',
          'Disadvantage: the range of materials is limited, and printed parts may not be strong enough for every aircraft component.',
        ],
        examinerTip:
          '"Analyse" at 6 marks wants both sides examined and the implications drawn out — keep the aircraft-manufacturing context in every point.',
      },
    ],
  },
  {
    id: 't2-q21',
    section: 's2-2',
    source: 'November 2023 · Paper 0417/13 · Q8(b)',
    stem: 'A house contains a smart security system.',
    parts: [
      {
        prompt: 'Identify two sensors that could be used with the smart security system.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Infra-red / motion sensor',
          'Pressure sensor',
          'Contact or magnetic sensor on a door or window',
          'Light sensor',
          'Sound sensor',
          'Smoke or gas sensor',
        ],
      },
    ],
  },
  {
    id: 't2-q22',
    section: 's5-1',
    source: 'November 2023 · Paper 0417/13 · Q8(a)',
    stem: 'Many devices in the home can be connected to the internet so they can be controlled remotely. These devices are called smart devices. A house contains a smart security system.',
    parts: [
      {
        prompt: 'Describe the benefits and drawbacks of using a smart security system.',
        marks: 4,
        markPoints: [
          'Benefit: the owner can check cameras and arm or disarm the alarm from anywhere using a phone.',
          'Benefit: alerts are sent immediately, so the police or a neighbour can be contacted quickly.',
          'Benefit: footage is recorded and stored, providing evidence after a break-in.',
          'Benefit: lights can be switched on remotely to make the house look occupied.',
          'Drawback: it depends on power and an internet connection — if either fails, the system stops working.',
          'Drawback: it can be hacked, letting an intruder disable the alarm or watch the camera feed.',
          'Drawback: it is expensive to buy, install and maintain, and may need a subscription.',
          'Drawback: false alarms from pets or moving shadows can cause the owner to ignore real alerts.',
        ],
      },
    ],
  },
  {
    id: 't2-q23',
    section: 's1-4',
    source: 'March 2024 · Paper 0417/12 · Q11(a)',
    stem: 'More people use desktop computers rather than tablet computers when working at home.',
    parts: [
      {
        prompt: 'Discuss the advantages and disadvantages of using desktop computers rather than tablet computers for doing work at home.',
        marks: 6,
        markPoints: [
          'Advantage: more processing power, memory and storage, so demanding software runs better.',
          'Advantage: a full-size keyboard, mouse and large monitor make long periods of work faster and more comfortable.',
          'Advantage: components can be upgraded or repaired individually, and peripherals connect easily.',
          'Advantage: a wired network connection is more reliable than Wi-Fi, and there is no battery to run flat.',
          'Advantage: a desktop is usually cheaper for the same specification.',
          'Disadvantage: it is not portable — work can only be done at that desk.',
          'Disadvantage: it takes up much more space and needs a permanent mains supply.',
          'Disadvantage: it uses far more electricity than a tablet.',
          'Disadvantage: it is slower to start up and has no built-in touch screen or camera unless added.',
        ],
      },
    ],
  },
  {
    id: 't2-q24',
    section: 's2-1',
    source: 'March 2024 · Paper 0417/12 · Q11(b)',
    stem: 'Desktop computers use input and output devices.',
    parts: [
      {
        label: 'b(i)',
        prompt: 'State two input devices that can be used in a desktop computer for working at home.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Keyboard', 'Mouse', 'Webcam', 'Microphone', 'Scanner', 'Graphics tablet'],
      },
      {
        label: 'b(ii)',
        prompt: 'State two output devices that can be used in a desktop computer for working at home.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Monitor / screen', 'Printer', 'Speakers', 'Headphones', 'Plotter'],
        examinerTip:
          'A device that does both — a touch screen, or a headset — is risky here. Give clear, separate input and output devices.',
      },
    ],
  },
];
