'use client';

import { useState } from 'react';

type SessionTemplate = 'custom' | 'post_op_knee' | 'stroke_rehab' | 'low_back_pain' | 'geriatric_mobility';

export function TemplateObjectiveFields() {
  const [template, setTemplate] = useState<SessionTemplate>('custom');

  return (
    <>
      <div className="col-md-6">
        <label className="form-label" htmlFor="session-template-select">Session Template</label>
        <select
          id="session-template-select"
          name="sessionTemplate"
          className="form-select"
          value={template}
          onChange={(event) => setTemplate(event.target.value as SessionTemplate)}
          required
        >
          <option value="custom">Custom</option>
          <option value="post_op_knee">Post-op knee</option>
          <option value="stroke_rehab">Stroke rehab</option>
          <option value="low_back_pain">Low back pain</option>
          <option value="geriatric_mobility">Geriatric mobility</option>
        </select>
      </div>

      <div className="col-12">
        <label className="form-label">Objective Summary</label>
        <textarea name="objectiveSummary" className="form-control" rows={2} dir="auto" />
      </div>

      <div className="col-12">
        <p className="small text-muted mb-2">Objective Template Fields</p>
      </div>

      {template === 'post_op_knee' ? (
        <>
          <div className="col-md-6">
            <label className="form-label">Knee Flexion (deg)</label>
            <input name="postOpKneeFlexionDeg" type="number" className="form-control" min={0} max={180} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Knee Extension (deg)</label>
            <input name="postOpKneeExtensionDeg" type="number" className="form-control" min={-30} max={30} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Knee Effusion Grade</label>
            <select name="postOpKneeEffusionGrade" className="form-select" defaultValue="">
              <option value="">Not specified</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Gait Phase</label>
            <select name="postOpKneeGaitPhase" className="form-select" defaultValue="">
              <option value="">Not specified</option>
              <option value="loading_response">Loading response</option>
              <option value="mid_stance">Mid stance</option>
              <option value="terminal_stance">Terminal stance</option>
              <option value="swing">Swing</option>
              <option value="antalgic">Antalgic</option>
            </select>
          </div>
        </>
      ) : null}

      {template === 'stroke_rehab' ? (
        <>
          <div className="col-md-4">
            <label className="form-label">Ashworth</label>
            <input name="strokeAshworthScore" type="number" className="form-control" min={0} max={5} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Berg</label>
            <input name="strokeBergScore" type="number" className="form-control" min={0} max={56} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Functional Reach (cm)</label>
            <input name="strokeFunctionalReachCm" type="number" className="form-control" min={0} max={100} />
          </div>
        </>
      ) : null}

      {template === 'low_back_pain' ? (
        <>
          <div className="col-md-4">
            <label className="form-label">SLR Left (deg)</label>
            <input name="lowBackSlrLeftDeg" type="number" className="form-control" min={0} max={180} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">SLR Right (deg)</label>
            <input name="lowBackSlrRightDeg" type="number" className="form-control" min={0} max={180} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Schober (cm)</label>
            <input name="lowBackSchoberCm" type="number" className="form-control" min={0} max={20} step="0.1" required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Pain with movement</label>
            <select name="lowBackPainWithMovement" className="form-select" defaultValue="">
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </>
      ) : null}

      {template === 'geriatric_mobility' ? (
        <>
          <div className="col-md-4">
            <label className="form-label">TUG (seconds)</label>
            <input name="geriatricTugSeconds" type="number" className="form-control" min={0} max={600} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Tinetti</label>
            <input name="geriatricTinettiScore" type="number" className="form-control" min={0} max={28} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Fall Risk Class</label>
            <select name="geriatricFallRiskClass" className="form-select" defaultValue="" required>
              <option value="">Select</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
        </>
      ) : null}
    </>
  );
}
