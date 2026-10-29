import type { Checkpoint } from './types';

/**
 * Section 5 — The Effects of Using IT. The paper's "effects of IT" set also
 * reaches into implementation methods, so that question is attached to the
 * systems life cycle section that teaches it.
 */
export const topic05Checkpoints: Checkpoint[] = [
  {
    id: 't5-q1',
    section: 's5-1',
    source: 'March 2023 · Paper 0417/12 · Q8',
    stem: 'Many devices in the home can connect to the internet. These are called smart devices.',
    parts: [
      {
        prompt: 'Describe four benefits of using these smart devices.',
        marks: 4,
        answerSlots: 4,
        markPoints: [
          'They can be controlled remotely from a smartphone, so the user can switch things on before they get home.',
          'They free the user from routine tasks, giving them more leisure time.',
          'Heating and lighting can be scheduled or adjusted automatically, cutting energy use and bills.',
          'They improve security — cameras and smart doorbells can be checked from anywhere.',
          'Smart fridges and similar devices can track stock and reorder food automatically.',
          'They help people with disabilities or the elderly live independently through voice control.',
          'Devices can update themselves automatically with new features and security fixes.',
        ],
        examinerTip:
          'Four separate benefits, each written as a full described point ("...so that..."), not four one-word labels.',
      },
    ],
  },
  {
    id: 't5-q2',
    section: 's5-2',
    source: 'June 2023 · Paper 0417/12 · Q5',
    stem: 'State which health issue is most likely to occur from each description shown. Your answer must be different in each case.',
    parts: [
      {
        label: 'a',
        prompt: 'Typing on a keyboard for long periods of time.',
        marks: 1,
        markPoints: ['Repetitive Strain Injury (RSI) in the fingers, hands or wrists'],
      },
      {
        label: 'b',
        prompt: 'Looking at a computer screen for a long time.',
        marks: 1,
        markPoints: ['Eye strain (or headaches caused by it)'],
      },
      {
        label: 'c',
        prompt: 'Sitting with poor posture.',
        marks: 1,
        markPoints: ['Back and neck problems / backache'],
      },
    ],
  },
  {
    id: 't5-q3',
    section: 's5-2',
    source: 'June 2023 · Paper 0417/13 · Q5',
    stem: 'Identify two appropriate IT-related causes for each of the health issues. Your answers must be different in each case.',
    parts: [
      {
        label: 'a',
        prompt: 'Repetitive strain injury (RSI)',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Typing on a keyboard for long periods without a break.',
          'Repeated clicking or dragging with a mouse.',
          'Holding the wrist at an awkward angle with no wrist rest.',
          'Repeated tapping or swiping on a touch screen or games controller.',
        ],
      },
      {
        label: 'b',
        prompt: 'Eye strain',
        marks: 2,
        answerSlots: 2,
        markPoints: [
          'Staring at a screen for too long without looking away.',
          'Screen glare or reflections from windows and lights.',
          'Working in a badly lit room, or with screen brightness set too high.',
          'A flickering or low-resolution monitor, or sitting too close to the screen.',
        ],
        examinerTip:
          'The question asks for causes, not symptoms or solutions — "wearing glasses" or "take a break" would score nothing here.',
      },
    ],
  },
  {
    id: 't5-q4',
    section: 's5-1',
    source: 'November 2023 · Paper 0417/11 · Q8',
    stem: 'Microprocessor-controlled devices are used in the home.',
    parts: [
      {
        prompt: 'Describe, with examples, how using these devices can affect the health and fitness of their users.',
        marks: 6,
        markPoints: [
          'Negative: automatic devices such as robot vacuum cleaners and dishwashers remove manual work, so users take less exercise.',
          'Negative: less housework and more leisure time spent sitting can lead to weight gain and obesity.',
          'Negative: microwaves and smart ovens make ready meals easy, encouraging an unhealthy diet.',
          'Negative: online shopping delivered to the door removes the walk to the shops.',
          'Positive: the time saved on chores can be spent exercising or at the gym.',
          'Positive: smart fitness devices and health monitors track activity and encourage users to be active.',
          'Positive: smart fridges and diet apps help users plan healthier meals.',
          'Positive: devices help people with disabilities or the elderly stay independent and mobile.',
        ],
        examinerTip:
          'A 6-mark "describe, with examples" answer needs both sides and a named device in each point. A list of devices with no health effect scores nothing.',
      },
    ],
  },
  {
    id: 't5-q5',
    section: 's7-4',
    source: 'November 2023 · Paper 0417/12 · Q10(b)',
    stem: 'The manager of the Tawara Hotel has decided to computerise the hotel’s room booking system. Following the analysis, the systems analyst will implement the new system using either parallel running or direct changeover.',
    parts: [
      {
        prompt: 'Evaluate these different methods of implementation.',
        marks: 6,
        markPoints: [
          'Parallel running: old and new systems run side by side, so if the new system fails the old one is still available — no bookings are lost.',
          'Parallel running: results from both systems can be compared to check the new system is accurate.',
          'Parallel running: staff can be retrained gradually while the old system still works.',
          'Parallel running: it costs more because data must be entered twice and extra staff or hardware are needed.',
          'Direct changeover: the new system replaces the old one immediately, so it is the cheapest and fastest method.',
          'Direct changeover: benefits of the new booking system are available straight away.',
          'Direct changeover: if the new system fails there is no fallback, and the hotel could lose bookings and customers.',
          'Conclusion: for a hotel whose bookings are business-critical, parallel running is the safer choice despite the extra cost.',
        ],
        examinerTip:
          '"Evaluate" expects advantages and disadvantages of BOTH methods and a judgement at the end that refers back to the hotel.',
      },
    ],
  },
];
