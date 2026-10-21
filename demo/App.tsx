import { useEffect, useRef, useState } from 'react';
import {
  AttitudeIndicator,
  BatteryGauge,
  BubbleLevel,
  Clinometer,
  Compass,
  Dial,
  GaugeThemeProvider,
  LinearGauge,
  Odometer,
  RingGauge,
  SegmentedMeter,
  Speedometer,
  Tachometer,
  TankGauge,
  Thermometer,
  themes,
  WeatherConditions,
  WeatherIcon,
  type WeatherCondition,
  type FormatInput,
  type GaugeStatus,
  type Zone,
} from '../src';
import { Card, Choice, PulseContext, rand, Range, Toggle, useIsDark, usePulse } from './ui';

/* ------------------------------------------------------------------ */
/* Shared example data                                                */
/* ------------------------------------------------------------------ */

const HUMIDITY_ZONES: Zone[] = [
  { from: 0, to: 40, color: 'bad' },
  { from: 40, to: 60, color: 'warn' },
  { from: 60, to: 85, color: 'good' },
  { from: 85, to: 100, color: 'warn' },
];

const TILT_ZONES: Zone[] = [
  { from: -3, to: 3, color: 'good' },
  { from: 3, to: 12, color: 'warn' },
  { from: -12, to: -3, color: 'warn' },
  { from: 12, to: 90, color: 'bad' },
  { from: -90, to: -12, color: 'bad' },
];

const z = (zones: Zone[]) =>
  `[\n${zones.map((q) => `    { from: ${q.from}, to: ${q.to}, color: '${q.color}' },`).join('\n')}\n  ]`;

/* ------------------------------------------------------------------ */
/* Cards                                                              */
/* ------------------------------------------------------------------ */

function ThermometerCard() {
  const [v, setV] = useState(3.4);
  const [dual, setDual] = useState(true);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [warnBelow, setWarnBelow] = useState(2);
  const [alarmBelow, setAlarmBelow] = useState(0.5);
  const [status, setStatus] = useState<GaugeStatus>('ok');
  usePulse(() => setV(rand(-4, 12, 0.1)));
  const limits = { warnBelow, alarmBelow, warnAbove: 7, alarmAbove: 9, hysteresis: 0.3 };
  return (
    <Card
      id="thermometer"
      title="Thermometer"
      component="Thermometer"
      blurb="Walk-in cooler for cut stems. Warning and alarm limits on both sides; a second scale converts to °F."
      code={`<Thermometer
  value={${v}}
  min={-5}
  max={15}
  unit="C"${dual ? `\n  secondaryUnit="F"` : ''}${orientation === 'horizontal' ? `\n  orientation="horizontal"` : ''}
  ticks={{ step: 5, minor: 4 }}
  limits={{
    warnBelow: ${warnBelow},
    alarmBelow: ${alarmBelow},
    warnAbove: 7,
    alarmAbove: 9,
    hysteresis: 0.3,
  }}
  onStatusChange={(status, info) => notify(status, info.label)}
  label="Cooler 1"
/>`}
      controls={
        <>
          <Range label="Temperature" value={v} min={-5} max={15} step={0.1} onChange={setV} display={(x) => `${x.toFixed(1)} °C`} />
          <Choice label="Orientation" value={orientation} options={[['vertical', 'Vertical'], ['horizontal', 'Horizontal']]} onChange={setOrientation} />
          <Range label="Warn below" value={warnBelow} min={-4} max={6} step={0.5} onChange={(x) => setWarnBelow(Math.max(x, alarmBelow))} display={(x) => `${x.toFixed(1)} °C`} />
          <Range label="Alarm below" value={alarmBelow} min={-5} max={5} step={0.5} onChange={(x) => setAlarmBelow(Math.min(x, warnBelow))} display={(x) => `${x.toFixed(1)} °C`} />
          <Toggle label="Show °F scale" checked={dual} onChange={setDual} />
          <p className="m-0 self-end text-sm text-soft" aria-live="polite">
            Status: <strong className="font-semibold text-heading">{status}</strong>
          </p>
        </>
      }
    >
      <Thermometer
        value={v}
        min={-5}
        max={15}
        unit="C"
        secondaryUnit={dual ? 'F' : undefined}
        orientation={orientation}
        ticks={{ step: 5, minor: 4 }}
        limits={limits}
        onStatusChange={setStatus}
        label="Cooler 1"
        size={orientation === 'vertical' ? 130 : 340}
      />
    </Card>
  );
}

function DialCard() {
  const [v, setV] = useState(72);
  const [variant, setVariant] = useState<'both' | 'needle' | 'arc'>('both');
  const [sweep, setSweep] = useState(270);
  const [face, setFace] = useState(false);
  const [holds, setHolds] = useState({ min: 72, max: 72 });
  const update = (x: number) => {
    setV(x);
    setHolds((h) => ({ min: Math.min(h.min, x), max: Math.max(h.max, x) }));
  };
  usePulse(() => update(rand(30, 96)));
  const half = sweep / 2;
  return (
    <Card
      id="dial"
      title="Dial"
      component="Dial"
      blurb="Greenhouse humidity. Needle, arc or both; any sweep; recorded min/max hold pointers."
      code={`<Dial
  value={${v}}
  startAngle={${-half}}
  endAngle={${half}}
  variant="${variant}"${face ? '\n  face' : ''}
  format={{ unit: '%', maxDecimals: 0 }}
  zones={${z(HUMIDITY_ZONES)}}
  minHold={${holds.min}}
  maxHold={${holds.max}}
  label="Relative humidity"
/>`}
      controls={
        <>
          <Range label="Humidity" value={v} min={0} max={100} onChange={update} display={(x) => `${x}%`} />
          <Choice label="Variant" value={variant} options={[['both', 'Both'], ['needle', 'Needle'], ['arc', 'Arc']]} onChange={setVariant} />
          <Choice label="Sweep" value={sweep} options={[[270, '270°'], [240, '240°'], [180, '180°']]} onChange={setSweep} />
          <Toggle label="Face and bezel" checked={face} onChange={setFace} />
        </>
      }
    >
      <Dial
        value={v}
        startAngle={-half}
        endAngle={half}
        variant={variant}
        face={face}
        format={{ unit: '%', maxDecimals: 0 }}
        zones={HUMIDITY_ZONES}
        minHold={holds.min}
        maxHold={holds.max}
        label="Relative humidity"
        size={240}
      />
    </Card>
  );
}

function VanCard() {
  const [throttle, setThrottle] = useState(45);
  usePulse(() => setThrottle(rand(5, 95)));
  const speed = Math.round(throttle * 1.3);
  const gear = Math.min(5, Math.floor(speed / 26) + 1);
  const rpm = Math.round(900 + ((speed % 26) / 26) * 4800 + gear * 150);
  return (
    <Card
      id="speedometer"
      wide
      title="Speedometer & Tachometer"
      component="Speedometer"
      blurb="Presets built on Dial for the delivery van. The tachometer shows ×1000 tick labels and a red line."
      code={`<Speedometer value={${speed}} unit="km/h" max={160} ticks={{ step: 20, minor: 3 }} />
<Tachometer value={${rpm}} redline={6000} max={7000} />`}
      controls={<Range label="Throttle" value={throttle} min={0} max={100} onChange={setThrottle} display={(x) => `${x}%`} />}
    >
      <Speedometer value={speed} unit="km/h" max={160} ticks={{ step: 20, minor: 3 }} size={220} />
      <Tachometer value={rpm} redline={6000} max={7000} label="× 1000 rpm" size={200} />
    </Card>
  );
}

function CompassCard() {
  const [h, setH] = useState(245);
  const [mode, setMode] = useState<'needle' | 'card'>('needle');
  const [readout, setReadout] = useState<'both' | 'degrees' | 'cardinal'>('both');
  usePulse(() => setH(rand(0, 359)));
  return (
    <Card
      id="compass"
      title="Compass"
      component="Compass"
      blurb="Wind over the market stalls. Always turns the short way round, even from 350° to 10°."
      code={`<Compass
  heading={${h}}
  mode="${mode}"
  readout="${readout}"
  markers={[{ value: 128, label: 'Farm' }]}
/>`}
      controls={
        <>
          <Range label="Heading" value={h} min={0} max={359} onChange={setH} display={(x) => `${x}°`} />
          <Choice label="Mode" value={mode} options={[['needle', 'Needle'], ['card', 'Rotating card']]} onChange={setMode} />
          <Choice label="Readout" value={readout} options={[['both', 'Both'], ['degrees', 'Degrees'], ['cardinal', 'Cardinal']]} onChange={setReadout} />
          <div className="flex items-end gap-2">
            {[350, 10].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setH(d)}
                className="rounded border border-camel px-2.5 py-1 text-[13px] font-medium text-heading hover:bg-well"
              >
                Go to {d}°
              </button>
            ))}
          </div>
        </>
      }
    >
      <Compass heading={h} mode={mode} readout={readout} markers={[{ value: 128, label: 'Farm' }]} size={240} />
    </Card>
  );
}

function ClinometerCard() {
  const [a, setA] = useState(6.5);
  const [variant, setVariant] = useState<'level' | 'protractor'>('level');
  const [display, setDisplay] = useState<'degrees' | 'percent' | 'both'>('both');
  usePulse(() => setA(rand(-20, 20, 0.5)));
  return (
    <Card
      id="clinometer"
      title="Clinometer"
      component="Clinometer"
      blurb="Ramp angle for the loading dock. Reads in degrees, slope grade, or both."
      code={`<Clinometer
  value={${a}}
  variant="${variant}"
  display="${display}"
  min={${variant === 'level' ? -45 : -90}}
  max={${variant === 'level' ? 45 : 90}}
  zones={${z(TILT_ZONES)}}
/>`}
      controls={
        <>
          <Range label="Angle" value={a} min={-45} max={45} step={0.5} onChange={setA} display={(x) => `${x.toFixed(1)}°`} />
          <Choice label="Variant" value={variant} options={[['level', 'Level'], ['protractor', 'Protractor']]} onChange={setVariant} />
          <Choice label="Display" value={display} options={[['degrees', 'Degrees'], ['percent', 'Grade %'], ['both', 'Both']]} onChange={setDisplay} />
        </>
      }
    >
      <Clinometer
        value={a}
        variant={variant}
        display={display}
        min={variant === 'level' ? -45 : -90}
        max={variant === 'level' ? 45 : 90}
        ticks={variant === 'level' ? { step: 15, minor: 2 } : undefined}
        zones={TILT_ZONES}
        label="Loading ramp"
        size={240}
      />
    </Card>
  );
}

function LevelCard() {
  const [x, setX] = useState(1.2);
  const [y, setY] = useState(-0.6);
  const [variant, setVariant] = useState<'vial' | 'bullseye'>('vial');
  usePulse(() => {
    setX(rand(-4, 4, 0.1));
    setY(rand(-4, 4, 0.1));
  });
  return (
    <Card
      id="level"
      title="Bubble level"
      component="BubbleLevel"
      blurb="Is the display bench level? The bubble turns green inside the tolerance lines."
      code={`<BubbleLevel
  variant="${variant}"
  value={${x}}${variant === 'bullseye' ? `\n  valueY={${y}}` : ''}
  min={-5}
  max={5}
  tolerance={0.5}
/>`}
      controls={
        <>
          <Range label="Tilt X" value={x} min={-5} max={5} step={0.1} onChange={setX} display={(q) => `${q.toFixed(1)}°`} />
          {variant === 'bullseye' && <Range label="Tilt Y" value={y} min={-5} max={5} step={0.1} onChange={setY} display={(q) => `${q.toFixed(1)}°`} />}
          <Choice label="Variant" value={variant} options={[['vial', 'Vial'], ['bullseye', 'Bullseye']]} onChange={setVariant} />
        </>
      }
    >
      <BubbleLevel
        variant={variant}
        value={x}
        valueY={variant === 'bullseye' ? y : undefined}
        min={-5}
        max={5}
        tolerance={0.5}
        ticks={{ step: 1, minor: 1 }}
        size={variant === 'vial' ? 320 : 220}
      />
    </Card>
  );
}

function AttitudeCard() {
  const [pitch, setPitch] = useState(6);
  const [roll, setRoll] = useState(-14);
  usePulse(() => {
    setPitch(rand(-15, 15));
    setRoll(rand(-40, 40));
  });
  return (
    <Card
      id="attitude"
      title="Attitude indicator"
      component="AttitudeIndicator"
      blurb="Pitch and roll for the drone that photographs the growing fields. Bank limits shown as zones."
      code={`<AttitudeIndicator
  pitch={${pitch}}
  roll={${roll}}
  rollZones={[
    { from: 30, to: 60, color: 'warn' },
    { from: -60, to: -30, color: 'warn' },
  ]}
/>`}
      controls={
        <>
          <Range label="Pitch" value={pitch} min={-30} max={30} onChange={setPitch} display={(q) => `${q}°`} />
          <Range label="Roll" value={roll} min={-60} max={60} onChange={setRoll} display={(q) => `${q}°`} />
        </>
      }
    >
      <AttitudeIndicator
        pitch={pitch}
        roll={roll}
        rollZones={[
          { from: 30, to: 60, color: 'warn' },
          { from: -60, to: -30, color: 'warn' },
        ]}
        size={240}
      />
    </Card>
  );
}

function LinearCard() {
  const [v, setV] = useState(760);
  const [variant, setVariant] = useState<'bar' | 'pointer' | 'bullet'>('bullet');
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  usePulse(() => setV(rand(200, 1150, 10)));
  const zones: Zone[] = [
    { from: 0, to: 600, color: 'bad' },
    { from: 600, to: 900, color: 'warn' },
    { from: 900, to: 1200, color: 'good' },
  ];
  return (
    <Card
      id="linear"
      title="Linear gauge"
      component="LinearGauge"
      blurb="Stems sold this week against a target of 900. Bar, pointer or bullet chart."
      code={`<LinearGauge
  value={${v}}
  max={1200}
  variant="${variant}"${orientation === 'vertical' ? `\n  orientation="vertical"` : ''}
  target={900}
  format="#,##0 stems"
  zones={${z(zones)}}
  label="This week"
/>`}
      controls={
        <>
          <Range label="Stems sold" value={v} min={0} max={1200} step={10} onChange={setV} />
          <Choice label="Variant" value={variant} options={[['bar', 'Bar'], ['pointer', 'Pointer'], ['bullet', 'Bullet']]} onChange={setVariant} />
          <Choice label="Orientation" value={orientation} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} onChange={setOrientation} />
        </>
      }
    >
      <LinearGauge
        value={v}
        max={1200}
        variant={variant}
        orientation={orientation}
        target={900}
        format="#,##0 stems"
        ticks={{ step: 300, minor: 1 }}
        zones={zones}
        label="This week"
        size={orientation === 'horizontal' ? 380 : 140}
      />
    </Card>
  );
}

function TankCard() {
  const [v, setV] = useState(128);
  const [shape, setShape] = useState<'rounded' | 'cylinder' | 'rect' | 'circle'>('cylinder');
  usePulse(() => setV(rand(10, 195)));
  return (
    <Card
      id="tank"
      title="Tank gauge"
      component="TankGauge"
      blurb="Rain barrel behind the potting shed. The readout flips colour as the water passes it."
      code={`<TankGauge
  value={${v}}
  max={200}
  shape="${shape}"
  format={{ unit: 'L', maxDecimals: 0 }}
  zones={[{ from: 0, to: 30, color: 'bad' }]}
  markers={[{ value: 40, label: 'Refill' }]}
  label="Rain barrel"
/>`}
      controls={
        <>
          <Range label="Water" value={v} min={0} max={200} onChange={setV} display={(q) => `${q} L`} />
          <Choice
            label="Shape"
            value={shape}
            options={[['cylinder', 'Cylinder'], ['rounded', 'Rounded'], ['rect', 'Square'], ['circle', 'Circle']]}
            onChange={setShape}
          />
        </>
      }
    >
      <TankGauge
        value={v}
        max={200}
        shape={shape}
        format={{ unit: 'L', maxDecimals: 0 }}
        ticks={{ step: 50, minor: 1 }}
        zones={[{ from: 0, to: 30, color: 'bad' }]}
        markers={[{ value: 40, label: 'Refill' }]}
        label="Rain barrel"
        size={shape === 'circle' ? 200 : 180}
      />
    </Card>
  );
}

function BatteryCard() {
  const [v, setV] = useState(64);
  const [segments, setSegments] = useState(0);
  const [charging, setCharging] = useState(false);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  usePulse(() => setV(rand(3, 100)));
  return (
    <Card
      id="battery"
      title="Battery"
      component="BatteryGauge"
      blurb="Backup battery for the cooler compressor. Red under 15%, amber under 35% by default."
      code={`<BatteryGauge
  value={${v}}${segments ? `\n  segments={${segments}}` : ''}${charging ? '\n  charging' : ''}${orientation === 'vertical' ? `\n  orientation="vertical"` : ''}
  label="Cooler backup"
/>`}
      controls={
        <>
          <Range label="Charge" value={v} min={0} max={100} onChange={setV} display={(q) => `${q}%`} />
          <Choice label="Cells" value={segments} options={[[0, 'Continuous'], [4, '4'], [10, '10']]} onChange={setSegments} />
          <Choice label="Orientation" value={orientation} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} onChange={setOrientation} />
          <Toggle label="Charging" checked={charging} onChange={setCharging} />
        </>
      }
    >
      <BatteryGauge
        value={v}
        segments={segments}
        charging={charging}
        orientation={orientation}
        label="Cooler backup"
        size={orientation === 'horizontal' ? 220 : 90}
      />
    </Card>
  );
}

function SegmentedCard() {
  const [v, setV] = useState(62);
  const [peak, setPeak] = useState(62);
  const [layout, setLayout] = useState<'linear' | 'arc'>('linear');
  const [live, setLive] = useState(false);
  const peakRef = useRef(62);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const next = Math.max(0, Math.min(100, 55 + (Math.random() - 0.4) * 60));
      setV(Math.round(next));
      peakRef.current = Math.max(next, peakRef.current - 2.5);
      setPeak(Math.round(peakRef.current));
    }, 140);
    return () => clearInterval(t);
  }, [live]);
  usePulse(() => {
    const n = rand(10, 98);
    setV(n);
    setPeak(n);
    peakRef.current = n;
  });
  const zones: Zone[] = [
    { from: 0, to: 70, color: 'good' },
    { from: 70, to: 90, color: 'warn' },
    { from: 90, to: 100, color: 'bad' },
  ];
  return (
    <Card
      id="segmented"
      title="Segmented meter"
      component="SegmentedMeter"
      blurb="Point-of-sale load on market day, LED style with peak hold. Turn on Live to watch it move."
      code={`<SegmentedMeter
  value={${v}}
  peak={${peak}}
  segments={${layout === 'arc' ? 24 : 20}}
  layout="${layout}"
  animate={false}
  format="0%"
  zones={${z(zones)}}
  label="Till load"
/>`}
      controls={
        <>
          <Range
            label="Load"
            value={v}
            min={0}
            max={100}
            onChange={(q) => {
              setV(q);
              setPeak(q);
              peakRef.current = q;
            }}
            display={(q) => `${q}%`}
          />
          <Choice label="Layout" value={layout} options={[['linear', 'LED bar'], ['arc', 'Arc']]} onChange={setLayout} />
          <Toggle label="Live" checked={live} onChange={setLive} />
        </>
      }
    >
      <SegmentedMeter
        value={v}
        peak={peak}
        segments={layout === 'arc' ? 24 : 20}
        layout={layout}
        animate={false}
        format="0%"
        zones={zones}
        label="Till load"
        size={layout === 'arc' ? 220 : 340}
      />
    </Card>
  );
}

function RingCard() {
  const [b, setB] = useState(18);
  const [bo, setBo] = useState(26);
  const [c, setC] = useState(9);
  usePulse(() => {
    setB(rand(0, 24));
    setBo(rand(0, 40));
    setC(rand(0, 12));
  });
  const done = Math.round(((b + bo + c) / 76) * 100);
  return (
    <Card
      id="rings"
      title="Ring gauge"
      component="RingGauge"
      blurb="Progress on Saturday's wedding order. Extra rings nest inside the main one."
      code={`<RingGauge
  value={${b}}
  max={24}
  label="Bouquets"
  format="0 of 24"
  sublabel="${done}% of order"
  rings={[
    { value: ${bo}, max: 40, label: 'Boutonnières', format: '0 of 40' },
    { value: ${c}, max: 12, label: 'Centrepieces', format: '0 of 12' },
  ]}
/>`}
      controls={
        <>
          <Range label="Bouquets" value={b} min={0} max={24} onChange={setB} display={(q) => `${q} / 24`} />
          <Range label="Boutonnières" value={bo} min={0} max={40} onChange={setBo} display={(q) => `${q} / 40`} />
          <Range label="Centrepieces" value={c} min={0} max={12} onChange={setC} display={(q) => `${q} / 12`} />
        </>
      }
    >
      <RingGauge
        value={b}
        max={24}
        label="Bouquets"
        format="0 of 24"
        sublabel={`${done}% of order`}
        rings={[
          { value: bo, max: 40, label: 'Boutonnières', format: '0 of 40' },
          { value: c, max: 12, label: 'Centrepieces', format: '0 of 12' },
        ]}
        size={240}
      />
      <RingGauge value={done} format="0%" sweep={270} startAngle={-135} label="Whole order" size={170} thickness={16} />
    </Card>
  );
}

function WeatherCard() {
  const [temperature, setTemperature] = useState(14.1);
  const [lux, setLux] = useState(52000);
  const [raining, setRaining] = useState(false);
  const [intensity, setIntensity] = useState(40);
  const [wind, setWind] = useState(12);
  const [layout, setLayout] = useState<'card' | 'compact' | 'icon'>('card');
  usePulse(() => {
    setTemperature(rand(-6, 28, 0.1));
    setLux(rand(0, 100000, 500));
    setRaining(Math.random() < 0.4);
    setIntensity(rand(5, 95));
    setWind(rand(0, 40));
  });
  // Same fields weather-node publishes; the sky comes from the light level here.
  const reading = { temperature, raining, rain_intensity: intensity, wind_speed: wind, light_level: lux };
  const all: WeatherCondition[] = ['clear', 'partly-cloudy', 'cloudy', 'low-sun', 'clear-night', 'partly-cloudy-night', 'drizzle', 'rain', 'heavy-rain', 'snow', 'thunderstorm', 'fog', 'wind'];
  return (
    <Card
      id="weather"
      wide
      title="Weather conditions"
      component="WeatherConditions"
      blurb="Reads weather-node's payload directly. The icon follows the sky, rain and wind, and fades between conditions. Frost limits flag the temperature."
      code={`// weather-node publishes { type: "weather", data: {...} } over the POS websocket
const [reading, setReading] = useState<WeatherReading>();
useSubscribeToWebsocketTopic('weather', ({ data }) => setReading(data));

<WeatherConditions
  reading={reading}          // temperature, raining, rain_intensity, wind_speed, wind_pct, light_level, summary
  layout="${layout}"
  limits={{ warnBelow: 2, alarmBelow: 0 }}
  latitude={43.158}          // only needed to classify the sky from light_level
  longitude={-79.41}         // when the reading has no summary
/>

// Just the icon:
<WeatherIcon condition="partly-cloudy" wind={1} size={24} />`}
      controls={
        <>
          <Range label="Temperature" value={temperature} min={-10} max={35} step={0.1} onChange={setTemperature} display={(x) => `${x.toFixed(1)} °C`} />
          <Range label="Light level" value={lux} min={0} max={100000} step={500} onChange={setLux} display={(x) => `${x.toLocaleString()} lx`} />
          <Range label="Wind speed" value={wind} min={0} max={45} onChange={setWind} display={(x) => `${x} km/h`} />
          <Range label="Rain intensity" value={intensity} min={0} max={100} onChange={setIntensity} display={(x) => `${x}%`} />
          <Toggle label="Raining" checked={raining} onChange={setRaining} />
          <Choice label="Layout" value={layout} options={[['card', 'Card'], ['compact', 'Compact'], ['icon', 'Icon']]} onChange={setLayout} />
        </>
      }
    >
      <WeatherConditions reading={reading} layout={layout} label={layout === 'card' ? 'Vineland' : undefined} limits={{ warnBelow: 2, alarmBelow: 0 }} size={layout === 'card' ? 340 : layout === 'compact' ? 200 : 110} />
      <div className="grid grid-cols-5 gap-x-3 gap-y-2 sm:grid-cols-7">
        {all.map((c) => (
          <div key={c} className="flex flex-col items-center gap-1 text-[11px] text-soft">
            <WeatherIcon condition={c} size={44} title={c} />
            <span>{c}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OdometerCard() {
  const [v, setV] = useState(48213);
  const [variant, setVariant] = useState<'mechanical' | 'plain'>('mechanical');
  const [trip, setTrip] = useState(128.4);
  usePulse(() => {
    setV((x) => x + rand(20, 400));
    setTrip((t) => Math.round((t + rand(1, 30, 0.1)) * 10) / 10);
  });
  return (
    <Card
      id="odometer"
      title="Odometer"
      component="Odometer"
      blurb="Stems sold this season, and the van's trip meter. Each wheel rolls on its own."
      code={`<Odometer value={${v}} variant="${variant}" minDigits={6} format={{ grouping: false }} label="Stems this season" />
<Odometer value={${trip}} variant="${variant}" format={{ decimals: 1, grouping: false }} minDigits={4} label="Trip km" />`}
      controls={
        <>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setV((x) => x + rand(5, 60))}
              className="rounded bg-btn px-3 py-1.5 text-sm font-medium text-btn-fg hover:opacity-90"
            >
              Ring up a sale
            </button>
            <button
              type="button"
              onClick={() => setTrip((t) => Math.round((t + 12.7) * 10) / 10)}
              className="rounded border border-camel px-3 py-1.5 text-sm font-medium text-heading hover:bg-well"
            >
              Drive 12.7 km
            </button>
          </div>
          <Choice label="Style" value={variant} options={[['mechanical', 'Mechanical'], ['plain', 'Plain']]} onChange={setVariant} />
        </>
      }
    >
      <Odometer value={v} variant={variant} minDigits={6} format={{ grouping: false }} label="Stems this season" size={34} />
      <Odometer value={trip} variant={variant} format={{ decimals: 1, grouping: false }} minDigits={4} label="Trip km" size={34} />
    </Card>
  );
}

const FORMAT_PRESETS: Array<[string, string, FormatInput, number, number]> = [
  ['pattern', "'0.0 °C'", '0.0 °C', -10, 40],
  ['currency', "{ style: 'currency', currency: 'CAD' }", { style: 'currency', currency: 'CAD', maxDecimals: 0 }, 0, 5000],
  ['compact', "{ notation: 'compact', maxDecimals: 1 }", { notation: 'compact', maxDecimals: 1 }, 0, 250000],
  ['percent', '{ percentOfRange: true }', { percentOfRange: true }, 0, 750],
  ['signed', "'+0.00'", '+0.00', -5, 5],
  ['locale', "{ locale: 'fr-CA', decimals: 2, unit: 'kg' }", { locale: 'fr-CA', decimals: 2, unit: 'kg' }, 0, 2500],
  ['function', '(v) => `${Math.round(v / 12)} dozen`', (v: number) => `${Math.round(v / 12)} dozen`, 0, 600],
];

function FormattingCard() {
  const [preset, setPreset] = useState('currency');
  const [t, setT] = useState(0.62);
  const [custom, setCustom] = useState('$#,##0.00');
  usePulse(() => setT(Math.random()));
  const p = FORMAT_PRESETS.find((f) => f[0] === preset) ?? FORMAT_PRESETS[0];
  const isCustom = preset === 'custom';
  const [min, max] = isCustom ? [0, 1000] : [p[3], p[4]];
  const value = Math.round((min + t * (max - min)) * 100) / 100;
  const format: FormatInput = isCustom ? custom : p[2];
  const formatCode = isCustom ? `'${custom}'` : p[1];
  return (
    <Card
      id="formatting"
      wide
      title="Formatting"
      component="format"
      blurb="Every gauge takes a pattern string, an options object (Intl.NumberFormat under the hood) or a function. Tick labels inherit it without the unit."
      code={`<Dial value={${value}} min={${min}} max={${max}} format={${formatCode}} />
<LinearGauge value={${value}} min={${min}} max={${max}} format={${formatCode}} />`}
      controls={
        <>
          <Range label="Value" value={t} min={0} max={1} step={0.001} onChange={setT} display={() => String(value)} />
          <Choice
            label="Format"
            value={preset}
            options={[...FORMAT_PRESETS.map(([k]) => [k, k] as [string, string]), ['custom', 'custom pattern']]}
            onChange={setPreset}
          />
          {isCustom && (
            <div className="flex flex-col gap-1">
              <label htmlFor="fmt-pattern" className="text-sm font-medium text-heading">
                Pattern
              </label>
              <input
                id="fmt-pattern"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                className="rounded border border-line-strong bg-page px-2.5 py-1.5 font-mono text-sm text-ink focus:border-heading focus:outline-none"
              />
              <span className="text-xs text-soft">Try "0.0 km/h", "#,##0 L", "+0%" or "≈ 0.00 m".</span>
            </div>
          )}
        </>
      }
    >
      <Dial value={value} min={min} max={max} format={format} variant="arc" startAngle={-110} endAngle={110} ticks={{ count: 5 }} size={230} />
      <LinearGauge value={value} min={min} max={max} format={format} label="Same format" size={320} ticks={{ count: 4 }} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tailwind section (outside the theme provider on purpose)           */
/* ------------------------------------------------------------------ */

function TailwindCard() {
  const [v, setV] = useState(58);
  usePulse(() => setV(rand(5, 95)));
  return (
    <Card
      id="tailwind"
      wide
      title="Styled with Tailwind"
      component="className"
      blurb="No theme prop here. Colour comes from utility classes: text-* sets the ink, gauge-* utilities set any token, and classNames targets single parts."
      code={`/* app.css */
@import "tailwindcss";
@import "@joshtwc/react-gauges/tailwind.css";

<Dial
  value={${v}}
  className="text-emerald-800 dark:text-emerald-200 gauge-accent-emerald-600 gauge-track-emerald-100 dark:gauge-track-emerald-950"
  classNames={{ value: 'font-bold', needle: 'fill-emerald-900 dark:fill-emerald-100' }}
/>
<RingGauge value={${v}} className="text-rose-900 dark:text-rose-100 gauge-accent-rose-500 gauge-track-rose-100 dark:gauge-track-rose-950" format="0%" />
<LinearGauge value={${v}} className="text-sky-900 dark:text-sky-100 gauge-accent-[#0284c7]" label="Arbitrary value" />`}
      controls={<Range label="Value" value={v} min={0} max={100} onChange={setV} />}
    >
      <Dial
        value={v}
        className="text-emerald-800 dark:text-emerald-200 gauge-accent-emerald-600 gauge-track-emerald-100 dark:gauge-track-emerald-950"
        classNames={{ value: 'font-bold', needle: 'fill-emerald-900 dark:fill-emerald-100' }}
        size={210}
      />
      <RingGauge
        value={v}
        className="text-rose-900 dark:text-rose-100 gauge-accent-rose-500 gauge-track-rose-100 dark:gauge-track-rose-950"
        format="0%"
        size={170}
      />
      <LinearGauge value={v} className="text-sky-900 dark:text-sky-100 gauge-accent-[#0284c7]" label="Arbitrary value" size={300} />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

type ThemeKey = 'wateringCan' | 'neutral' | 'midnight' | 'brass';
type Mode = 'system' | 'light' | 'dark';

const NAV: Array<[string, string]> = [
  ['thermometer', 'Thermometer'],
  ['dial', 'Dial'],
  ['speedometer', 'Speedometer'],
  ['compass', 'Compass'],
  ['clinometer', 'Clinometer'],
  ['level', 'Bubble level'],
  ['attitude', 'Attitude'],
  ['linear', 'Linear'],
  ['tank', 'Tank'],
  ['battery', 'Battery'],
  ['segmented', 'Segmented'],
  ['rings', 'Rings'],
  ['odometer', 'Odometer'],
  ['weather', 'Weather'],
  ['formatting', 'Formatting'],
  ['tailwind', 'Tailwind'],
];

export function App() {
  const [themeKey, setThemeKey] = useState<ThemeKey>('wateringCan');
  const [mode, setMode] = useState<Mode>('system');
  const [pulse, setPulse] = useState(0);
  const dark = useIsDark();

  // Leave the host's data-theme alone until the user picks a page mode.
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) return;
    const root = document.documentElement;
    if (mode === 'system') delete root.dataset.theme;
    else root.dataset.theme = mode;
  }, [mode]);

  const theme =
    themeKey === 'wateringCan' ? (dark ? themes.wateringCanDark : themes.wateringCan) : themes[themeKey];

  return (
    <PulseContext.Provider value={pulse}>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
        <header className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-soft">@joshtwc/react-gauges · playground</p>
            <h1 className="m-0 text-4xl font-semibold sm:text-5xl">react-gauges</h1>
            <p className="m-0 max-w-2xl text-[17px] text-soft">
              Thirteen SVG gauge types for React, plus speedometer and tachometer presets: thermometers, dials, compasses, clinometers and more. Each one takes ranges, zones and
              flexible number formatting, follows your theme, and animates on its own.
            </p>
          </div>
          <hr className="m-0 w-24 border-0 border-t-2 border-camel" />
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Choice
              label="Gauge theme"
              value={themeKey}
              options={[
                ['wateringCan', 'Watering Can'],
                ['neutral', 'Match page'],
                ['midnight', 'Midnight'],
                ['brass', 'Brass'],
              ]}
              onChange={setThemeKey}
            />
            <Choice
              label="Page"
              value={mode}
              options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]}
              onChange={(m) => {
                touched.current = true;
                setMode(m);
              }}
            />
            <button
              type="button"
              onClick={() => setPulse((p) => p + 1)}
              className="rounded-[var(--twc-radius)] bg-btn px-4 py-2 text-sm font-medium text-btn-fg hover:opacity-90"
            >
              Shuffle readings
            </button>
          </div>
          <nav aria-label="Gauges" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map(([id, name]) => (
              <a key={id} href={`#${id}`} className="font-medium">
                {name}
              </a>
            ))}
          </nav>
        </header>

        <main className="mt-8 flex flex-col gap-6">
          <GaugeThemeProvider theme={theme}>
            <div className="grid gap-6 lg:grid-cols-2" data-gauge-theme={themeKey}>
              <ThermometerCard />
              <DialCard />
              <VanCard />
              <CompassCard />
              <ClinometerCard />
              <LevelCard />
              <AttitudeCard />
              <LinearCard />
              <TankCard />
              <BatteryCard />
              <SegmentedCard />
              <RingCard />
              <OdometerCard />
              <WeatherCard />
              <FormattingCard />
            </div>
          </GaugeThemeProvider>
          <TailwindCard />
        </main>
        <footer className="mt-10 text-sm text-soft">
          Every gauge supports <code className="font-mono">size</code>, <code className="font-mono">theme</code>,{' '}
          <code className="font-mono">className</code>, <code className="font-mono">classNames</code>,{' '}
          <code className="font-mono">animate</code> and ARIA meter semantics. See the README for the full prop reference.
        </footer>
      </div>
    </PulseContext.Provider>
  );
}
