import type { Checkpoint } from './types';

/**
 * Section 4 — Networks and the Effects of Using Them.
 * 4.1 covers devices, addressing, network types and the cloud; 4.2 covers
 * security of data transfer, authentication and electronic conferencing.
 */
export const topic04Checkpoints: Checkpoint[] = [
  {
    id: 't4-q1',
    section: 's4-1',
    source: 'June 2023 · Paper 0417/11 · Q3',
    stem: 'A headteacher is setting up a newsletter to send to parents of pupils at a school. She has some photographs saved on storage devices that she needs to place in the newsletter.',
    parts: [
      {
        prompt: 'State two communication methods which the headteacher could use to upload the photographs onto the school network.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Wi-Fi (wireless connection to the school network)',
          'Bluetooth',
          'A wired connection such as a USB cable or Ethernet cable',
          'Emailing the photographs to herself and downloading them on a networked computer',
          'Uploading them to cloud storage shared with the network',
        ],
      },
    ],
  },
  {
    id: 't4-q2',
    section: 's4-2',
    source: 'June 2023 · Paper 0417/11 · Q6',
    stem: 'A student has set up a password for his laptop computer. The password he has chosen is Px2zY!Cg3?bd',
    parts: [
      {
        label: 'a',
        prompt: 'Discuss the benefits and drawbacks of using this password.',
        marks: 6,
        markPoints: [
          'Benefit: it is long (12 characters), so a brute-force attack would take a very long time.',
          'Benefit: it mixes upper case, lower case, digits and symbols, which greatly increases the number of combinations.',
          'Benefit: it is not a dictionary word, name or date, so a dictionary attack will not find it.',
          'Benefit: it looks random, so it cannot be guessed from the student’s personal details.',
          'Drawback: it is very hard to memorise, so the student may write it down where someone could find it.',
          'Drawback: being hard to remember, he may reset it often or reuse it on other accounts.',
          'Drawback: it is slow and error-prone to type, especially on a phone keyboard.',
          'Drawback: a strong password alone does not protect against keylogging, phishing or shoulder surfing.',
        ],
        examinerTip:
          '"Discuss" at 6 marks needs roughly three benefits and three drawbacks. Refer to the actual password — say WHY the mix of characters and the length matter.',
      },
      {
        label: 'b',
        prompt:
          'The student could have protected his laptop computer by using two-factor authentication, combining his password with a biometric method. State two examples of biometric methods he could use.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Fingerprint recognition',
          'Face recognition',
          'Retina or iris scan',
          'Voice recognition',
        ],
        examinerTip: 'A PIN, a password or a code sent by text is not biometric — biometrics measure the body.',
      },
    ],
  },
  {
    id: 't4-q3',
    section: 's4-2',
    source: 'June 2023 · Paper 0417/12 · Q8',
    stem: 'A teacher provides revision lessons during the holidays. The teacher plans to use web-conferencing for the lessons.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by web-conferencing.',
        marks: 3,
        markPoints: [
          'A meeting or lesson held over the internet between people in different locations, in real time.',
          'Participants use a computer or device with a webcam, microphone, speakers and web-conferencing software.',
          'As well as live video and audio, users can share their screen, share documents and use a whiteboard and text chat.',
          'A delegate list lets the host see and control who is taking part.',
        ],
      },
      {
        label: 'b',
        prompt: 'Evaluate the use of web-conferencing in this scenario.',
        marks: 6,
        markPoints: [
          'Advantage: students and teacher do not have to travel to school in the holidays, saving time and travel costs.',
          'Advantage: the school building does not have to open, saving heating and staffing costs.',
          'Advantage: students who have moved away or are ill can still join the revision lesson.',
          'Advantage: the lesson can be recorded and rewatched before the exam.',
          'Advantage: documents and the teacher’s screen can be shared instantly with everyone.',
          'Disadvantage: everyone needs a device, a webcam and a reliable, fast internet connection — some students may not have one.',
          'Disadvantage: a dropped connection, lag or poor sound quality can break up the lesson.',
          'Disadvantage: the teacher cannot see whether students are working, and it is harder to keep them engaged.',
          'Disadvantage: practical demonstrations and one-to-one help are harder than face to face.',
          'Conclusion: worthwhile for revision, provided the school checks every student has a suitable connection.',
        ],
        examinerTip:
          '"Evaluate" needs both sides plus a judgement. Keep every point tied to holiday revision lessons, not conferencing in general.',
      },
    ],
  },
  {
    id: 't4-q4',
    section: 's4-1',
    source: 'June 2023 · Paper 0417/13 · Q2(a)',
    stem: 'Identify the most appropriate hardware from the descriptions given.',
    parts: [
      {
        prompt: 'An internal hardware component that connects a computer to a Local Area Network.',
        marks: 1,
        markPoints: ['Network Interface Card (NIC)'],
      },
    ],
  },
  {
    id: 't4-q5',
    section: 's4-1',
    source: 'June 2023 · Paper 0417/13 · Q4',
    stem: 'A company uses an intranet. They are considering using an extranet.',
    parts: [
      {
        prompt: 'Compare an intranet with an extranet. Your answer must include similarities and differences.',
        marks: 6,
        markPoints: [
          'Similarity: both are private networks belonging to the organisation and both use internet technologies and a browser.',
          'Similarity: both require a username and password, so only authorised users get in.',
          'Similarity: both hold information the organisation controls, so it is more reliable than the open internet.',
          'Difference: an intranet is for employees only, whereas an extranet also admits selected outsiders such as customers, suppliers or partners.',
          'Difference: an intranet is normally only reachable from inside the company network, whereas an extranet is reached from outside over the internet.',
          'Difference: an extranet needs stronger security — firewalls, encryption, VPN access — because it is exposed beyond the company.',
          'Difference: an extranet costs more to set up and maintain than an intranet.',
          'Difference: an extranet lets the company share order and stock information directly with suppliers, which an intranet cannot.',
        ],
        examinerTip:
          'The command word is "compare" and the paper says the answer must include both. Aim for at least two similarities before you start on differences.',
      },
    ],
  },
  {
    id: 't4-q6',
    section: 's4-2',
    source: 'June 2023 · Paper 0417/13 · Q9',
    stem: 'The manager of an organisation is planning a meeting of its directors. The manager plans to use audio-conferencing for the meeting.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by audio-conferencing.',
        marks: 3,
        markPoints: [
          'A meeting held between people in different places using sound only, in real time.',
          'It can use telephone lines or VoIP over the internet.',
          'The organiser books the conference, is given a phone number and a PIN, and passes these to the participants.',
          'Each participant dials the number and enters the PIN to join the call.',
        ],
      },
      {
        label: 'b',
        prompt:
          'The organisation could use video-conferencing for the meeting. Describe three advantages of using audio-conferencing rather than video-conferencing in this scenario.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'It needs far less bandwidth, so the connection is more reliable and there is less lag.',
          'The equipment is cheaper and simpler — no webcams, large screens or conference cameras needed.',
          'Directors can join from anywhere, including from a car or while travelling, using only a phone.',
          'No special conference room has to be set up or booked.',
          'Participants do not have to be presentable on camera, and there is less setting-up time.',
          'It is easier for participants with older equipment or a slow connection to take part.',
        ],
      },
      {
        label: 'c',
        prompt: 'Identify the hardware and software required to join the audio-conference.',
        marks: 4,
        answerSlots: 4,
        markPoints: [
          'Hardware: a telephone or a computer/smartphone.',
          'Hardware: a microphone (or headset) to speak into.',
          'Hardware: speakers or headphones to hear the other participants.',
          'Hardware: a modem/router for an internet connection if VoIP is used.',
          'Software: VoIP or audio-conferencing software.',
          'Software: a device driver for the microphone and speakers.',
        ],
        examinerTip: 'The question asks for BOTH hardware and software — an answer with only hardware cannot reach 4 marks.',
      },
    ],
  },
  {
    id: 't4-q7',
    section: 's4-1',
    source: 'November 2023 · Paper 0417/11 · Q5',
    stem: 'A bridge and a router are examples of networking devices.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain the differences between a bridge and a router.',
        marks: 2,
        markPoints: [
          'A bridge joins two LANs (or two segments of the same LAN) that use the same protocol, whereas a router connects different networks — typically a LAN to the internet/WAN.',
          'A bridge forwards data using MAC addresses, whereas a router forwards data using IP addresses.',
          'A router holds a routing table and chooses the best path for the data, whereas a bridge simply passes traffic between the two segments.',
        ],
      },
      {
        label: 'b',
        prompt: 'IP addresses are used in computer networks. Explain what is meant by an IP address.',
        marks: 4,
        markPoints: [
          'An IP (Internet Protocol) address is a unique numerical address given to every device on a network.',
          'It identifies the device so that data can be sent to the correct destination.',
          'IPv4 addresses are written as four numbers 0–255 separated by dots; IPv6 uses a longer hexadecimal form.',
          'It can be static (fixed) or dynamic (assigned by the router/ISP each time the device connects).',
          'Unlike a MAC address, an IP address changes when the device joins a different network.',
        ],
      },
      {
        label: 'c',
        prompt: 'Explain the purpose of a routing table.',
        marks: 2,
        markPoints: [
          'It is a list held in the router of the networks it can reach and the route to each one.',
          'The router looks up the destination IP address in the table to decide which path to forward the data packet along.',
          'It lets the router choose the shortest or fastest available route, and reroute if a path fails.',
        ],
      },
    ],
  },
  {
    id: 't4-q8',
    section: 's4-1',
    source: 'November 2023 · Paper 0417/12 · Q3',
    parts: [
      {
        prompt: 'Identify three different network communication devices and describe what each one does.',
        marks: 6,
        answerSlots: 3,
        markPoints: [
          'Router — connects a LAN to another network or the internet and uses IP addresses and a routing table to forward packets along the best path.',
          'Switch — connects devices within a LAN and sends data only to the port of the device whose MAC address matches.',
          'Hub — connects devices within a LAN but broadcasts incoming data to every connected device.',
          'Bridge — joins two LANs (or segments) using the same protocol so they act as one network.',
          'Network Interface Card (NIC) — the internal card that lets a computer connect to a network and gives it its MAC address.',
          'Modem — converts digital data to analogue for transmission over a telephone line and back again.',
          'Wireless access point — lets Wi-Fi devices join a wired network.',
        ],
        examinerTip:
          'Six marks: one for each device named, one for each description. Naming three devices without describing them scores only 3.',
      },
    ],
  },
  {
    id: 't4-q9',
    section: 's4-1',
    source: 'November 2023 · Paper 0417/12 · Q8(a)',
    stem: 'State the most appropriate storage medium from its description.',
    parts: [
      {
        prompt: 'A storage medium that stores data on the internet.',
        marks: 1,
        markPoints: ['Cloud storage'],
      },
    ],
  },
  {
    id: 't4-q10',
    section: 's4-1',
    source: 'November 2023 · Paper 0417/12 · Q10(d)',
    stem: 'The manager of the Tawara Hotel has decided to computerise the hotel’s room booking system. The hotel uses both a WAN and a WLAN.',
    parts: [
      {
        prompt: 'Describe the differences between a WAN and a WLAN.',
        marks: 4,
        markPoints: [
          'A WAN (Wide Area Network) covers a large geographical area — different towns, countries or continents — whereas a WLAN (Wireless LAN) covers a small area such as one building or site.',
          'A WAN usually connects several LANs together, often using third-party telecommunication links, whereas a WLAN connects individual devices to one local network.',
          'A WAN commonly uses cable, fibre or satellite links, whereas a WLAN uses radio waves through wireless access points.',
          'A WLAN is cheaper and simpler to set up than a WAN, which needs leased lines or an ISP.',
          'Data transfer on a WLAN is usually faster over its short range, while a WAN is slower and more prone to latency.',
          'A WLAN is easier to intercept, so it needs encryption; WAN links are typically secured with a VPN.',
        ],
      },
    ],
  },
  {
    id: 't4-q11',
    section: 's4-1',
    source: 'November 2023 · Paper 0417/13 · Q5',
    stem: 'A student needs to purchase a new computer for use on his university course. The laptop computers available to him are one that contains a solid-state drive (SSD) or one that only stores data on the internet, using the cloud.',
    parts: [
      {
        prompt: 'Evaluate these two types of laptop computer.',
        marks: 6,
        markPoints: [
          'SSD: files are available with no internet connection, so the student can work anywhere on campus or while travelling.',
          'SSD: access is very fast and does not depend on connection speed.',
          'SSD: the student keeps control of his own data and its privacy.',
          'SSD: capacity is fixed and limited, and if the laptop is lost, stolen or fails, the work is lost unless backed up.',
          'Cloud: files are backed up remotely and can be reached from any device, so a lost laptop does not mean lost coursework.',
          'Cloud: storage can be expanded easily and files are simple to share with tutors and group members.',
          'Cloud: nothing can be opened without an internet connection, which is a problem off campus.',
          'Cloud: ongoing subscription costs, slower access over a poor connection, and the student must trust the provider with his data.',
          'Conclusion: for a university course a cloud-only laptop is risky unless connectivity is guaranteed; an SSD laptop with cloud backup is the safer combination.',
        ],
        examinerTip:
          '"Evaluate these two types" means both must be covered, with good and bad points for each, and a conclusion that names a choice.',
      },
    ],
  },
  {
    id: 't4-q12',
    section: 's4-1',
    source: 'March 2024 · Paper 0417/12 · Q12',
    parts: [
      {
        prompt: 'Describe how data is stored and managed when using cloud computing.',
        marks: 4,
        markPoints: [
          'Data is stored on remote servers owned by a third-party provider rather than on the user’s own device.',
          'The servers are housed in data centres, and the user uploads and downloads files over the internet.',
          'The same data is copied to more than one server (data redundancy), so it survives a server failure.',
          'The provider manages the hardware, backups, updates and security, so the user does not have to.',
          'The user logs in with a username and password and can reach their files from any internet-connected device.',
          'Storage capacity can be increased or reduced on demand, usually paid for by subscription.',
        ],
      },
    ],
  },
];
