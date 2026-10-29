import type { Checkpoint } from './types';

/** Section 3 — Storage Devices and Media. */
export const topic03Checkpoints: Checkpoint[] = [
  {
    id: 't3-q1',
    section: 'solid-state-storage',
    source: 'June 2023 · Paper 0417/11 · Q11',
    stem: 'Portable hard drives can be Solid State Drives (SSDs) or Hard Disk Drives (HDDs).',
    parts: [
      {
        prompt: 'Explain why the SSD may be better to use than the HDD.',
        marks: 4,
        markPoints: [
          'An SSD has no moving parts, so it is far more robust if the portable drive is dropped or knocked.',
          'Access and transfer times are much faster because there is no seek time waiting for a platter to spin.',
          'It uses less power, so a bus-powered portable drive drains the host laptop battery less.',
          'It runs silently and generates less heat.',
          'It is lighter and can be made physically smaller, so it is easier to carry.',
          'There is no risk of damage from magnetic fields.',
        ],
        examinerTip:
          'Every point must be a comparison in favour of the SSD. Listing SSD features without saying why that is better than an HDD does not score.',
      },
    ],
  },
  {
    id: 't3-q2',
    section: 'optical-storage',
    source: 'June 2023 · Paper 0417/12 · Q12',
    stem: 'Movies can be stored on Blu-ray discs or an internal hard disk.',
    parts: [
      {
        label: 'a',
        prompt: 'Describe why Blu-ray discs are preferred to an internal hard disk for storing movies.',
        marks: 4,
        markPoints: [
          'Blu-ray is portable — the disc can be carried to and played on another device.',
          'Blu-ray has a very high capacity (around 25–50 GB), enough for a high-definition film.',
          'Discs are cheap to mass-produce and distribute to customers.',
          'The disc is read-only, so the movie cannot be accidentally deleted or overwritten.',
          'Optical discs have no magnetic platter and read/write head, so they survive being moved around better.',
          'Storing movies on the hard disk would use up internal storage needed for other files.',
        ],
      },
      {
        label: 'b(i)',
        prompt: 'Hard disks and Blu-ray discs are examples of backing storage. State two characteristics of backing storage.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'It is non-volatile — data is kept when the power is switched off.',
          'It has a much larger capacity than internal memory.',
          'It is not directly accessed by the CPU — data must be loaded into RAM first.',
          'It is slower to access than internal memory, and cheaper per gigabyte.',
        ],
      },
      {
        label: 'b(ii)',
        prompt: 'Identify two other types of backing storage.',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Solid State Drive (SSD) / memory stick / flash memory card',
          'Magnetic tape',
          'DVD or CD',
          'External / portable hard disk drive',
        ],
        examinerTip: '"Other" rules out Blu-ray and the internal hard disk named in the stem.',
      },
    ],
  },
  {
    id: 't3-q3',
    section: 'internal-vs-backing',
    source: 'November 2023 · Paper 0417/12 · Q8(b, c, d)',
    stem: 'State the most appropriate storage medium from its description.',
    parts: [
      {
        label: 'b',
        prompt: 'Internal storage where the current instruction is stored.',
        marks: 1,
        markPoints: ['RAM (Random Access Memory)'],
      },
      {
        label: 'c',
        prompt: 'A solid-state storage that is used in digital cameras.',
        marks: 1,
        markPoints: ['(SD) memory card / flash memory card'],
      },
      {
        label: 'd',
        prompt: 'An optical storage medium that stores high-definition (HD) movies.',
        marks: 1,
        markPoints: ['Blu-ray disc'],
      },
    ],
  },
  {
    id: 't3-q4',
    section: 'solid-state-storage',
    source: 'March 2024 · Paper 0417/12 · Q1',
    optionList: [
      'Actuator',
      'Blu-ray disc',
      'Cloud',
      'DVD',
      'Flash memory',
      'Hard disk',
      'Printer',
      'SD card',
    ],
    parts: [
      {
        prompt: 'Circle two items from the list which are solid-state storage media.',
        marks: 2,
        answerSlots: 2,
        markPoints: ['Flash memory', 'SD card'],
        examinerTip:
          'Solid-state means no moving parts and no disc: Blu-ray, DVD and hard disk all move, an actuator and a printer are not storage, and the cloud is remote storage rather than a medium.',
      },
    ],
  },
];
