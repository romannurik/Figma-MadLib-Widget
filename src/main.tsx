/** @jsx figma.widget.h */

import { on, once, showUI } from '@create-figma-plugin/utilities';
import { COLORS, DEFAULT_TEMPLATE_STRING } from './const';
const { widget } = figma;
const { Input, AutoLayout, Frame, Image, Text, useSyncedState, usePropertyMenu, useSyncedMap, useWidgetId } = widget;

type ValueSetter = (id: string, value?: PhraseValue) => void;

function MadLibWidget() {
  const [onboardingStep, setOnboardingStep] = useSyncedState<OnboardingStep>('onboardingStep', 'reveal-type');
  const [isAutoReveal, setAutoReveal] = useSyncedState<boolean>('isAutoReveal', false);
  const [isRevealed, setRevealed] = useSyncedState<boolean>('isRevealed', false);
  const [templateString, setTemplateString] = useSyncedState<string>('template', DEFAULT_TEMPLATE_STRING);
  const [colorName, setColorName] = useSyncedState<string>('color', 'pink');
  const values = useSyncedMap<PhraseValue>('phraseValues');
  const widgetNodeId = useWidgetId();

  const color = COLORS[colorName];
  const template = parseTemplate(templateString);
  const canReveal = !isRevealed && !isAutoReveal && areAllValuesSet(template, values);
  const authorPhotos = values.entries()
    .map(([_, val]) => val)
    .reduce<{ [id: string]: string }>((acc, val) => {
      acc[val.authorId] = val.authorPhotoUrl;
      return acc;
    }, {});

  usePropertyMenu(
    ([
      !onboardingStep && values.size && {
        itemType: 'action',
        tooltip: 'Clear',
        propertyName: 'clear',
      },
      !onboardingStep && !values.size && {
        itemType: 'action',
        tooltip: 'Reset',
        propertyName: 'reset',
      },
      !onboardingStep && !values.size && {
        itemType: 'action',
        tooltip: 'Edit',
        propertyName: 'edit',
      },
      {
        itemType: 'color-selector',
        tooltip: 'Color',
        propertyName: 'color',
        selectedOption: color.fill,
        options: Object.values(COLORS).map(
          ({ label, fill }): WidgetPropertyMenuColorSelectorOption =>
            ({ option: fill, tooltip: label })),
      },
    ] as WidgetPropertyMenuItem[]).filter(i => !!i),
    ({ propertyName, propertyValue }) => {
      switch (propertyName) {
        case 'edit':
          widget.waitForTask((async () => {
            let newTemplateString = await editTemplate(
              { widgetNodeId, color, initialTemplate: templateString });
            if (newTemplateString) {
              setTemplateString(newTemplateString);
            }
          })());
          break;

        case 'reset':
          setOnboardingStep('reveal-type');
          setTemplateString(DEFAULT_TEMPLATE_STRING);
          setRevealed(false);
          for (let k of values.keys()) {
            values.delete(k);
          }
          break;

        case 'clear':
          setRevealed(false);
          for (let k of values.keys()) {
            values.delete(k);
          }
          break;

        case 'color':
          setColorName(Object.entries(COLORS).find(([, { fill }]) => fill === propertyValue)![0]);
          break;
      }
    },
  );

  if (onboardingStep === 'reveal-type') {
    return <Container heading="Replies should be…">
      <AutoLayout
        direction="vertical"
        height="hug-contents"
        horizontalAlignItems="center"
        verticalAlignItems="center"
        spacing={8}>
        <ChoiceButton colors={color} width={32 * 5 + 8 * 4}
          label="Open"
          onClick={() => {
            setAutoReveal(true);
            setOnboardingStep(null);
          }} />
        <ChoiceButton colors={color} width={32 * 5 + 8 * 4}
          label="Secret"
          onClick={() => {
            setAutoReveal(false);
            setOnboardingStep(null);
          }} />
      </AutoLayout>
    </Container>;
  }

  return <Container fill={color.tonal}>
    <AutoLayout
      direction="vertical"
      spacing={20}
      overflow="visible">
      <AutoLayout
        direction="vertical"
        spacing={8}
        overflow="visible">
        {template.lines.map(({ tokens }, lineNumber) =>
          <AutoLayout key={lineNumber} direction="horizontal" spacing={4}
            overflow="visible">
            {tokens.map((token, index) => {
              if (typeof token === 'string') {
                return <Text key={index} fontFamily="Inter" fontWeight="medium" fontSize={16} lineHeight={24}>
                  {token}
                </Text>;
              }

              return <Phrase key={token.id}
                reveal={isAutoReveal || isRevealed}
                templatePhrase={token}
                value={values.get(token.id)}
                color={color}
                widgetNodeId={widgetNodeId}
                setter={(id, value) => value ? values.set(id, value) : values.delete(id)} />
            })}
          </AutoLayout>)}
      </AutoLayout>
      {(isRevealed || isAutoReveal) && !!Object.entries(authorPhotos).length &&
        <AutoLayout overflow="visible">
          {Object.entries(authorPhotos).map(([id, url], index) =>
            <Frame key={id} width={20} height={24} overflow="visible">
              <Image src={url} cornerRadius={999} width={24} height={24}
                stroke={color.tonal} strokeWidth={2} strokeAlign="outside" />
            </Frame>)}
        </AutoLayout>}
      {canReveal && <Button
        color={color.fill}
        onClick={() => setRevealed(true)}>
        Reveal
      </Button>}
    </AutoLayout>
  </Container>;
}

interface PhraseProps extends BaseProps {
  color: Colors;
  templatePhrase: TemplatePhrase;
  widgetNodeId: string;
  reveal: boolean;
  setter: ValueSetter;
  value?: PhraseValue;
}

function Phrase({ templatePhrase, reveal, value, color, widgetNodeId, setter }: PhraseProps) {
  let { placeholder } = templatePhrase;

  if (reveal) {
    // Not quite ready because <Input> can't be auto-sized :-/
    return <AutoLayout direction='horizontal' padding={{ bottom: 1 }}>
      <Input value={value?.value || ''}
        // width={(value?.value || placeholder).length * 10}
        placeholder={placeholder}
        fontFamily="Kalam"
        fontWeight="bold"
        inputBehavior='wrap'
        inputFrameProps={{
          padding: { left: value ? 0 : 2, top: 7, right: value ? 0 : 2, bottom: 0 },
          fill: color.tonal,
          effect: {
            type: 'drop-shadow',
            offset: { x: 0, y: 1 },
            blur: 0,
            color: color.fill,
          }
        }}
        fill={color.fill}
        fontSize={16}
        lineHeight={16}
        onTextEditEnd={ev => {
          setter(templatePhrase.id, ev.characters ? {
            authorId: figma.currentUser!.id!,
            authorName: figma.currentUser!.name,
            authorPhotoUrl: figma.currentUser!.photoUrl!,
            value: ev.characters,
          } : undefined);
        }} />
    </AutoLayout>;
  }

  return <AutoLayout
    fill={(value && !reveal) ? color.fill : color.tonal}
    verticalAlignItems="center"
    horizontalAlignItems="end"
    overflow={!value ? 'hidden' : 'visible'} // hide placeholder descenders
    direction="vertical"
    padding={{ left: value ? 0 : 2, top: 7, right: value ? 0 : 2, bottom: 0 }}
    onClick={value
      ? async () => {
        if (!reveal && value.authorId !== figma.currentUser?.id) {
          // If you didn't write it, you can't look!
          figma.notify("No peeking!");
          return;
        }

        // You wrote it, or everything is revealed, so allow editing
        await editPhrase({ widgetNodeId, templatePhrase, value, color, setter });
      }
      : async () => {
        // Show editor (first-time!)
        await editPhrase({ widgetNodeId, templatePhrase, value, color, setter });
      }
    }
    effect={value ? [] : {
      type: 'drop-shadow',
      offset: { x: 0, y: 1 },
      blur: 0,
      color: color.fill,
    }}>
    <Text fontFamily="Kalam" fontWeight="bold" fill={color.fill} fontSize={16} lineHeight={16}
      opacity={!value ? 0.3 : reveal ? 1 : 0}>
      {value ? value.value : `(${placeholder})`}
    </Text>
    <Frame width={12} height={1} overflow="visible">
      {value && !reveal && <Image
        src={value.authorPhotoUrl}
        width={16} height={16} y={-11}
        cornerRadius={999} stroke={color.tonal} strokeWidth={2} strokeAlign="outside" />}
    </Frame>
  </AutoLayout>;
}

interface EditTemplateArgs {
  widgetNodeId: string;
  color: Colors;
  initialTemplate: string;
}

function editTemplate({ widgetNodeId, color, initialTemplate }: EditTemplateArgs): Promise<string> {
  return new Promise<string>(resolve => {
    let n = figma.getNodeById(widgetNodeId) as WidgetNode;
    showUI(
      {
        width: 340,
        height: 212,
        title: `Write your mad lib!`,
        position: {
          x: n.absoluteTransform[0][2] + n.width / 2,
          y: n.absoluteTransform[1][2] + n.height * 2 / 3
        },
      },
      {
        editor: 'template',
        initialValue: initialTemplate,
        colorTonal: color.tonal,
        color: color.fill,
      });
    once('SAVE', (value: string) => resolve(value));
    figma.once('close', () => resolve(initialTemplate));
  });
}

interface EditPhraseArgs {
  widgetNodeId: string;
  value?: PhraseValue;
  color: Colors;
  templatePhrase: TemplatePhrase;
  setter: ValueSetter;
}

async function editPhrase({ widgetNodeId, value, color, templatePhrase, setter }: EditPhraseArgs) {
  if (!figma.currentUser?.id) {
    figma.notify('Log in to participate!', { error: true });
    return;
  }

  await new Promise(resolve => {
    let n = figma.getNodeById(widgetNodeId) as WidgetNode;
    showUI(
      {
        width: 296,
        height: 52,
        title: `Enter a "${templatePhrase.placeholder}"`,
        position: {
          x: n.absoluteTransform[0][2] + n.width / 2,
          y: n.absoluteTransform[1][2] + n.height * 2 / 3
        },
      },
      {
        editor: 'phrase',
        initialValue: value?.value,
        color: color.fill,
      });
    let dereg = on('SET_VALUE', (value: string) => {
      setter(templatePhrase.id, value ? {
        authorId: figma.currentUser!.id!,
        authorName: figma.currentUser!.name,
        authorPhotoUrl: figma.currentUser!.photoUrl!,
        value,
      } : undefined);
      // resolve(null);
    })
    once('CLOSE', () => resolve(null));
    figma.once('close', () => dereg());
  });
}

interface ButtonProps extends BaseProps, HasChildrenProps {
  color: string;
}

function Button({ children, color, onClick }: ButtonProps) {
  return <AutoLayout horizontalAlignItems="center" verticalAlignItems="center"
    padding={{ vertical: 8, horizontal: 24 }}
    fill={color}
    cornerRadius={100}
    onClick={onClick}>
    <Text fill="#FFFFFF" fontFamily="Inter" fontSize={14} lineHeight={20} fontWeight="bold">
      {children?.toString()}
    </Text>
  </AutoLayout>;
}

interface ContainerProps extends HasChildrenProps {
  heading?: string;
  fill?: HexCode;
}

function Container({ heading, fill, children }: ContainerProps) {
  return <AutoLayout
    direction="vertical"
    horizontalAlignItems="center"
    verticalAlignItems="center"
    height="hug-contents"
    width="hug-contents"
    padding={{ top: heading ? 12 : 16, right: 16, bottom: 16, left: 16 }}
    fill={fill || '#FFFFFFF'}
    cornerRadius={16}
    spacing={12}
    stroke={{ r: 0, g: 0, b: 0, a: 0.05 }}
    strokeWidth={1}
    strokeAlign="outside"
    effect={{
      type: 'drop-shadow',
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 2 },
      blur: 6,
    }}>
    {heading && <Text
      fontFamily="Inter"
      fontWeight="semi-bold"
      fontSize={14}
      lineHeight={20}>
      {heading}
    </Text>}
    {children}
  </AutoLayout>;
}

interface ChoiceButtonProps {
  label: string;
  colors: Colors;
  circle?: boolean;
  width?: number;
  onClick: () => void;
}

function ChoiceButton({ label, width, circle, colors, onClick }: ChoiceButtonProps) {
  return <AutoLayout
    direction="horizontal"
    width={circle ? 32 : (width || 'hug-contents')}
    height={32}
    horizontalAlignItems="center"
    verticalAlignItems="center"
    fill={colors.tonal}
    cornerRadius={100}
    padding={{ horizontal: 20 }}
    onClick={onClick}>
    <Text fontSize={16} lineHeight={24} fontWeight="bold" fill={colors.fill}>
      {label}
    </Text>
  </AutoLayout>
}

function areAllValuesSet(template: Template, values: SyncedMap<PhraseValue>) {
  let ids = new Set();
  for (let l of template.lines) {
    for (let t of l.tokens) {
      if (typeof t !== 'string') {
        ids.add(t.id);
      }
    }
  }

  for (let [id] of values.entries()) {
    ids.delete(id);
  }

  return ids.size === 0;
}

const trim = (s: string) => s.replace(/^\s+|\s+$/g, '');

function parseTemplate(templateString: string): Template {
  const template: Template = { lines: [] };
  let valueId = 1;
  for (let line of templateString.split('\n')) {
    let tokens: TemplateToken[] = [];
    const re = /\{(.+?)\}/g;
    let i = 0;
    for (let m of Array.from(line.matchAll(re))) {
      if (m.index! > i) {
        tokens.push(trim(line.substring(i, m.index)));
      }
      tokens.push({ id: String(valueId++), placeholder: trim(String(m[1])) });
      i = m.index! + m[0].length;
    }
    if (i < line.length) {
      tokens.push(line.substring(i));
    }
    template.lines.push({ tokens });
  }
  return template;
}

export default function () {
  widget.register(MadLibWidget);
}
