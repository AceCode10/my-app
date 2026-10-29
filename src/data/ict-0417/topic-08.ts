import type { Checkpoint } from './types';

/**
 * Section 8 — Safety and Security.
 * 8.1 physical safety, 8.2 eSafety, 8.3 security of data.
 */
export const topic08Checkpoints: Checkpoint[] = [
  {
    id: 't8-q1',
    section: 's8-2',
    source: 'March 2023 · Paper 0417/12 · Q4(b)',
    stem: 'Social media can be used to communicate with friends.',
    parts: [
      {
        prompt: 'Give four precautions that young people should take when using social media.',
        marks: 4,
        answerSlots: 4,
        markPoints: [
          'Do not give out personal data such as your full name, address, school or phone number.',
          'Set your profile and posts to private so only accepted friends can see them.',
          'Only accept friend requests from people you know in real life.',
          'Do not post photographs that identify where you live or go to school, and turn off location tagging.',
          'Never arrange to meet an online-only contact, or take a trusted adult if you do.',
          'Use a strong password and do not share it with friends.',
          'Block and report anyone who behaves inappropriately, and tell a trusted adult.',
          'Think before you post — content can be copied and is difficult to remove.',
        ],
        examinerTip:
          'Four separate precautions. "Be careful" is not a precaution — say exactly what the young person should or should not do.',
      },
    ],
  },
  {
    id: 't8-q2',
    section: 's8-3',
    source: 'March 2023 · Paper 0417/12 · Q11(a, b, c)',
    stem: 'A student has downloaded a file which contains a virus.',
    parts: [
      {
        label: 'a',
        prompt: 'Describe the possible effects on his computer system if he opens the file.',
        marks: 2,
        markPoints: [
          'Files or data may be deleted, corrupted or encrypted so they cannot be used.',
          'The computer may run very slowly, crash or fail to boot as the virus fills memory or storage.',
          'The virus can copy itself and spread to other files and to other computers on the network.',
          'Personal data such as passwords may be stolen and sent to the attacker.',
          'Software or the operating system may stop working properly.',
        ],
      },
      {
        label: 'b',
        prompt: 'Explain how the student could prevent the computer from being infected by viruses.',
        marks: 3,
        markPoints: [
          'Install anti-virus software and keep its virus definitions up to date.',
          'Run regular full scans and scan files and removable media before opening them.',
          'Do not open email attachments or download files from unknown or untrusted sources.',
          'Keep the operating system and applications patched with the latest security updates.',
          'Use a firewall to block suspicious incoming traffic.',
          'Avoid using other people’s memory sticks, or scan them first.',
        ],
      },
      {
        label: 'c(i)',
        prompt:
          'Some files containing viruses have to be quarantined as they cannot be deleted. State the type of files that may have to be quarantined rather than deleted.',
        marks: 1,
        markPoints: [
          'System files (operating system files the computer needs in order to run).',
        ],
      },
      {
        label: 'c(ii)',
        prompt: 'Explain how the software detects and quarantines the file.',
        marks: 3,
        markPoints: [
          'The anti-virus software scans each file and compares its code against a database of known virus signatures.',
          'It also looks for suspicious behaviour typical of a virus (heuristic checking).',
          'If a match is found, the file is moved to a separate, isolated area of storage — the quarantine.',
          'Quarantined files cannot be opened or run, so the virus cannot spread.',
          'The user is alerted and can then choose to have the file disinfected or deleted.',
        ],
      },
    ],
  },
  {
    id: 't8-q3',
    section: 's8-1',
    source: 'June 2023 · Paper 0417/11 · Q5',
    stem: 'State the safety issue that is most likely to occur for each of these causes.',
    parts: [
      {
        label: 'a',
        prompt: 'Spilling drinks on computer equipment.',
        marks: 1,
        markPoints: ['Electrocution (or electric shock)'],
      },
      {
        label: 'b',
        prompt: 'Overloading sockets by plugging in too many devices.',
        marks: 1,
        markPoints: ['Fire'],
      },
      {
        label: 'c',
        prompt: 'Trailing cables across the floor.',
        marks: 1,
        markPoints: ['Tripping over / falling'],
      },
      {
        label: 'd',
        prompt: 'Placing a laser printer at the edge of a table.',
        marks: 1,
        markPoints: ['Heavy equipment falling and injuring someone'],
        examinerTip:
          'These are safety issues (immediate injury), not health issues. Name the hazard, not the precaution.',
      },
    ],
  },
  {
    id: 't8-q4',
    section: 's8-3',
    source: 'June 2023 · Paper 0417/12 · Q6(a, b, c)',
    stem: 'A company requires its employees to regularly change their login passwords for the company’s computer systems. Passwords must be strong and cannot be reused.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain three problems that may occur when the employees change their passwords regularly.',
        marks: 6,
        answerSlots: 3,
        markPoints: [
          'Employees forget the new password, so they are locked out and cannot work until IT resets it.',
          'Frequent resets create extra work and cost for the IT support department.',
          'Because the passwords are hard to remember, employees write them down, which is less secure than a fixed strong password.',
          'Employees pick predictable variations (Password1, Password2), which are easy for an attacker to guess.',
          'Employees may share or reuse passwords across systems to cope, weakening security further.',
          'Time is wasted at each change while employees update stored logins on several devices.',
        ],
        examinerTip:
          'Six marks for three problems means each one needs a point AND its consequence — "they forget it" alone is half an answer.',
      },
      {
        label: 'b',
        prompt: 'The company has a website which uses a digital certificate. Explain the purpose of the digital certificate.',
        marks: 1,
        markPoints: [
          'It proves the website is authentic — that it belongs to the organisation it claims to — so the user can trust it and exchange data securely.',
        ],
      },
      {
        label: 'c',
        prompt: 'A digital certificate is attached to an email. State three items contained in a digital certificate.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'The owner’s name / organisation name',
          'The owner’s public key',
          'The serial number of the certificate',
          'The expiry date (and start date)',
          'The name of the Certificate Authority that issued it',
          'The digital signature of the Certificate Authority',
        ],
      },
    ],
  },
  {
    id: 't8-q5',
    section: 's8-3',
    source: 'June 2023 · Paper 0417/13 · Q6',
    stem: 'Two-factor authentication can use a number of different forms of identification. One form of identification is to use ‘where the user is’ — an example of this would be the user’s GPS location.',
    parts: [
      {
        label: 'a',
        prompt: 'State two other forms of identification. Give an appropriate example of each.',
        marks: 4,
        answerSlots: 2,
        markPoints: [
          'Something the user knows — example: a password, a PIN or a memorable date.',
          'Something the user has — example: a mobile phone that receives a one-time code, a smart card or a dongle.',
          'Something the user is — example: a fingerprint, a face scan or an iris scan.',
        ],
        examinerTip: 'Two marks for naming the forms, two for the examples. An example on its own does not score the naming mark.',
      },
      {
        label: 'b',
        prompt: 'Explain the purpose of two-factor authentication.',
        marks: 2,
        markPoints: [
          'It makes the user prove their identity in two different ways before access is granted.',
          'Even if one factor is stolen — a password, say — the attacker still cannot get in without the second factor.',
          'This greatly increases the security of the account and reduces the risk of fraud.',
        ],
      },
    ],
  },
  {
    id: 't8-q6',
    section: 's8-3',
    source: 'November 2023 · Paper 0417/11 · Q7',
    stem: 'An employee in a company has used QWERTY123 as his login password for some time.',
    optionList: [
      'Anti-spyware',
      'Biometrics',
      'A digital certificate',
      'A dongle',
      'Encryption',
      'A firewall',
      'Two-factor authentication',
      'User ID',
    ],
    parts: [
      {
        label: 'a',
        prompt: 'Give three reasons why this is not advisable.',
        marks: 3,
        answerSlots: 3,
        markPoints: [
          'QWERTY is the first row of the keyboard and 123 is a sequence, so it is one of the first combinations an attacker tries.',
          'It contains no symbols and only one case pattern, so the number of combinations is small and it falls quickly to a brute-force attack.',
          'It appears in dictionaries of common passwords used in dictionary attacks.',
          'It has been used for a long time without being changed, so if it has already been leaked the attacker still has access.',
          'It is short, which further reduces the time needed to crack it.',
        ],
      },
      {
        label: 'b(i)',
        prompt:
          'Complete the sentence using the most appropriate data protection method from the list. Your answers must be different in each case. "A method which scrambles the data so that it cannot be understood is ..."',
        marks: 1,
        markPoints: ['Encryption'],
      },
      {
        label: 'b(ii)',
        prompt: '"A fingerprint is an example of ..."',
        marks: 1,
        markPoints: ['Biometrics'],
      },
      {
        label: 'b(iii)',
        prompt: '"A method of guaranteeing a website is authentic is ..."',
        marks: 1,
        markPoints: ['A digital certificate'],
      },
      {
        label: 'b(iv)',
        prompt: '"A hardware device that filters the information coming through the Internet connection into a LAN is ..."',
        marks: 1,
        markPoints: ['A firewall'],
      },
      {
        label: 'c',
        prompt: 'An employee in the company uses his company password for other accounts. Explain why this is not a good idea.',
        marks: 1,
        markPoints: [
          'If any one of those other accounts is breached, the attacker can use the same password to get into the company system as well.',
        ],
      },
    ],
  },
  {
    id: 't8-q7',
    section: 's8-3',
    source: 'November 2023 · Paper 0417/13 · Q4',
    stem: 'A company’s computer system is protected by both a user ID and a password.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain how a user ID and a password are used to increase the security of data.',
        marks: 6,
        markPoints: [
          'The user ID identifies who is trying to log in and is checked against the list of authorised users.',
          'The password authenticates that person — it proves they are who the user ID claims.',
          'Both must match the stored record before access is granted, so an unauthorised person with only one of them is refused.',
          'The user ID lets the system apply access rights, so each employee only sees the data their role allows.',
          'Activity can be logged against the user ID, so misuse can be traced back to an individual.',
          'Passwords are stored encrypted and shown as asterisks when typed, so they cannot be read.',
          'The number of attempts is limited and the account locks after repeated failures, defeating brute-force attacks.',
        ],
        examinerTip:
          'Six marks: cover identification, authentication, access rights and what happens when someone gets it wrong — not just "it stops hackers".',
      },
      {
        label: 'b',
        prompt:
          'The company plans to improve the security of its computer system by using biometric methods. Describe what is meant by biometric methods, and give two examples of biometrics.',
        marks: 4,
        answerSlots: 3,
        markPoints: [
          'Description: security methods that identify a person by a unique physical or behavioural characteristic of their body.',
          'Description: the characteristic is scanned and compared with a stored template; access is granted only if it matches.',
          'Description: it cannot be forgotten, lost or easily shared, unlike a password.',
          'Example: fingerprint recognition',
          'Example: face recognition',
          'Example: retina or iris scan',
          'Example: voice recognition',
        ],
      },
    ],
  },
  {
    id: 't8-q8',
    section: 's8-3',
    source: 'March 2024 · Paper 0417/12 · Q8',
    stem: 'A student has been the victim of a vishing scam.',
    parts: [
      {
        label: 'a',
        prompt: 'Explain what is meant by the term vishing.',
        marks: 2,
        markPoints: [
          'Vishing is voice phishing — a fraudster telephones the victim, or leaves a voicemail, pretending to be a bank or other trusted organisation.',
          'The caller tricks the victim into revealing personal or financial details such as bank details, passwords or PINs.',
          'Those details are then used to commit fraud or steal money.',
        ],
      },
      {
        label: 'b',
        prompt: 'Describe two methods that help to prevent vishing.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Never give personal or bank details to someone who has phoned you — hang up and call the organisation back on the number from its official website or your statement.',
          'Use a different phone, or wait several minutes, before calling back, so the fraudster cannot keep the line open.',
          'Be suspicious of unexpected calls that create urgency or ask you to move money.',
          'Register with a call-blocking or do-not-call service, or use a phone that screens unknown numbers.',
          'Remember that genuine banks never ask for your full password or PIN over the phone.',
        ],
      },
    ],
  },
  {
    id: 't8-q9',
    section: 's8-2',
    source: 'March 2024 · Paper 0417/12 · Q16',
    parts: [
      {
        label: 'a',
        prompt: 'State four characteristics of spam emails.',
        marks: 4,
        answerSlots: 4,
        markPoints: [
          'They are unsolicited — sent to people who did not ask for them.',
          'They are sent in bulk to very large numbers of addresses at once.',
          'They are usually advertising a product, service or scam.',
          'The sender is unknown to the recipient, and the address is often spoofed or meaningless.',
          'They often contain spelling and grammar mistakes.',
          'They may contain links to fake websites or attachments carrying malware.',
          'They frequently use urgent or too-good-to-be-true subject lines to force a click.',
        ],
      },
      {
        label: 'b',
        prompt: 'Give two ways of reducing spam emails.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Turn on a spam filter so suspect messages go straight to a junk folder.',
          'Add senders to a blocked list and mark messages as spam so the filter learns.',
          'Do not publish your email address on public websites or forums.',
          'Never reply to, or click "unsubscribe" in, a spam email — it confirms the address is live.',
          'Untick boxes agreeing to marketing when signing up to websites.',
          'Use a second, disposable email address for online registrations.',
        ],
      },
    ],
  },
];
