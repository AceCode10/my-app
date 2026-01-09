'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Assessment } from '@/types/assessment';

interface TestConfigurationProps {
  config: Partial<Assessment>;
  onChange: (updates: Partial<Assessment>) => void;
}

export function TestConfiguration({ config, onChange }: TestConfigurationProps) {
  const handleChange = (field: keyof Assessment, value: any) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Test title and description</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Test Title *</Label>
            <Input
              id="title"
              value={config.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Chapter 5 Quiz"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={config.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the test"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions for Students</Label>
            <Textarea
              id="instructions"
              value={config.instructions || ''}
              onChange={(e) => handleChange('instructions', e.target.value)}
              placeholder="Special instructions or notes for students"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Test Settings</CardTitle>
          <CardDescription>Configure timing and attempts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={config.duration_minutes || ''}
                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || null)}
                placeholder="Leave empty for untimed"
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for untimed test
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_attempts">Maximum Attempts</Label>
              <Input
                id="max_attempts"
                type="number"
                value={config.max_attempts || 1}
                onChange={(e) => handleChange('max_attempts', parseInt(e.target.value) || 1)}
                min={1}
                max={10}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passing_marks">Passing Marks</Label>
              <Input
                id="passing_marks"
                type="number"
                value={config.passing_marks || ''}
                onChange={(e) => handleChange('passing_marks', parseInt(e.target.value) || null)}
                placeholder="Optional"
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="show_results">Show Results</Label>
              <Select
                value={config.show_results || 'immediately'}
                onValueChange={(value) => handleChange('show_results', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately">Immediately</SelectItem>
                  <SelectItem value="after_deadline">After Deadline</SelectItem>
                  <SelectItem value="manual">Manual Release</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Question Settings</CardTitle>
          <CardDescription>Configure question display and behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="randomize_questions">Randomize Question Order</Label>
              <p className="text-sm text-muted-foreground">
                Questions appear in random order for each student
              </p>
            </div>
            <Switch
              id="randomize_questions"
              checked={config.randomize_questions || false}
              onCheckedChange={(checked) => handleChange('randomize_questions', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="randomize_answers">Randomize Answer Choices</Label>
              <p className="text-sm text-muted-foreground">
                Answer choices appear in random order (for MCQ)
              </p>
            </div>
            <Switch
              id="randomize_answers"
              checked={config.randomize_answers || false}
              onCheckedChange={(checked) => handleChange('randomize_answers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="calculator_allowed">Allow Calculator</Label>
              <p className="text-sm text-muted-foreground">
                Students can use calculator during test
              </p>
            </div>
            <Switch
              id="calculator_allowed"
              checked={config.calculator_allowed || false}
              onCheckedChange={(checked) => handleChange('calculator_allowed', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Template Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
          <CardDescription>Save as reusable template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_template">Save as Template</Label>
              <p className="text-sm text-muted-foreground">
                Template tests can be reused and duplicated
              </p>
            </div>
            <Switch
              id="is_template"
              checked={config.is_template || false}
              onCheckedChange={(checked) => handleChange('is_template', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
