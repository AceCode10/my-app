
import {genkit, configureGenkit} from '@genkit-ai/core';
import {googleAI} from '@genkit-ai/google-genai';
import {firebase} from "@genkit-ai/firebase";

export const ai = genkit({
  plugins: [googleAI()],
});

configureGenkit({
  plugins: [
    googleAI({
      apiVersion: ['v1', 'v1beta'],
    }),
    firebase({
      // We are disabling tracing here to avoid a critical dependency issue with NextJS.
      // See: https://github.com/firebase/genkit/issues/1090
      trace: false
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
