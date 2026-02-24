'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnswerInput } from './AnswerInput';

export function AnswerInputDemo() {
  const [shortAnswer, setShortAnswer] = useState('');
  const [essayAnswer, setEssayAnswer] = useState('');
  const [calculationAnswer, setCalculationAnswer] = useState('');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Modern Answer Input Component</h1>
        <p className="text-muted-foreground">
          Inspired by Tutopiya's clean, modern design with rich formatting capabilities
        </p>
      </div>

      {/* Short Answer Example */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Short Answer</CardTitle>
            <Badge variant="secondary">Basic</Badge>
          </div>
          <CardDescription>
            Simple text input without formatting toolbar - perfect for quick answers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnswerInput
            value={shortAnswer}
            onChange={setShortAnswer}
            placeholder="Type your short answer here..."
            showFormatting={false}
            autoResize={false}
            className="min-h-[80px]"
          />
        </CardContent>
      </Card>

      {/* Calculation Example */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Calculation Answer</CardTitle>
            <Badge variant="secondary">Math & Science</Badge>
          </div>
          <CardDescription>
            With formatting tools for equations, superscripts, and subscripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnswerInput
            value={calculationAnswer}
            onChange={setCalculationAnswer}
            placeholder="Enter your calculation and answer..."
            showFormatting={true}
            autoResize={true}
            maxHeight={300}
            className="min-h-[120px]"
          />
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Use the formatting tools to write equations like:
              <br />
              • E = mc² (superscript)
              <br />
              • H₂O (subscript)
              <br />
              • <strong>Important values</strong> (bold)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Essay Example */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Essay Answer</CardTitle>
            <Badge variant="secondary">Long Form</Badge>
          </div>
          <CardDescription>
            Full-featured rich text editor with all formatting options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnswerInput
            value={essayAnswer}
            onChange={setEssayAnswer}
            placeholder="Write your detailed essay here..."
            showFormatting={true}
            autoResize={true}
            maxHeight={500}
            className="min-h-[250px]"
          />
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Features available:</strong>
              <br />
              • Text formatting: Bold, Italic
              <br />
              • Lists: Bullet points, Numbered lists
              <br />
              • Text alignment: Left, Center, Right
              <br />
              • Math notation: Superscript, Subscript
              <br />
              • Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+Z (undo), Ctrl+Y (redo)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Component Features</CardTitle>
          <CardDescription>
            Everything you need for a modern answer input experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Rich Text Formatting</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Bold and italic text</li>
                <li>• Superscript and subscript for equations</li>
                <li>• Bullet and numbered lists</li>
                <li>• Text alignment options</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">User Experience</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Auto-resize textarea</li>
                <li>• Undo/redo functionality</li>
                <li>• Keyboard shortcuts</li>
                <li>• Character counter</li>
                <li>• Clear button to reset content</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Developer Friendly</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fully customizable appearance</li>
                <li>• Optional formatting toolbar</li>
                <li>• Configurable maximum height</li>
                <li>• TypeScript support</li>
                <li>• Accessible by design</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Performance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Optimized re-renders</li>
                <li>• Efficient history management</li>
                <li>• Lightweight dependencies</li>
                <li>• Smooth animations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
