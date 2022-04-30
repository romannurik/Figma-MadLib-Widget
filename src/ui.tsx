import { Button, Container, render, Text, Textbox, TextboxMultiline, useInitialFocus, VerticalSpace } from '@create-figma-plugin/ui';
import { emit } from '@create-figma-plugin/utilities';
import { h } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import styles from './ui.css';

function Plugin({ editor, ...props }: { editor: 'phrase' | 'template' }) {
  return (editor === 'phrase')
    ? <PhraseEditor {...props as PhraseEditorProps} />
    : <TemplateEditor {...props as TemplateEditorProps} />;
}

interface PhraseEditorProps {
  initialValue?: string;
  color: string;
}

function PhraseEditor({ initialValue, color }: PhraseEditorProps) {
  const [text, setText] = useState(initialValue || '');

  useEffect(() => emit('SET_VALUE', text), [text]);

  return <Container style={{ '--color-accent': color }}>
    <VerticalSpace space='small' />
    <Textbox
      {...useInitialFocus()}
      onValueInput={setText}
      onKeyDownCapture={ev => {
        (ev.key === 'Enter' || ev.key === 'Escape') && emit('CLOSE');
      }}
      value={text} />
    <VerticalSpace space='small' />
  </Container>;
}

interface TemplateEditorProps {
  initialValue?: string;
  color: string;
  colorTonal: string;
}

function TemplateEditor({ initialValue, color, colorTonal }: TemplateEditorProps) {
  const [text, setText] = useState(initialValue || '');
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  return <Container style={{ '--color-accent': color }}>
    <VerticalSpace space='small' />
    <Text muted>Example:</Text>
    <VerticalSpace space="extraSmall" />

    <Text>
      As a <b>{`{user type}`}</b>, I like <b>{`{adjective}`}</b> pancakes!
    </Text>
    <VerticalSpace space='small' />
    <div style={{
      display: 'grid',
      position: 'relative',
    }}>
      <FakeText scrollOffset={scrollOffset} color={color} colorTonal={colorTonal} text={text} />
      <TextboxMultiline
        {...useInitialFocus()}
        rows={4}
        onValueInput={setText}
        onScroll={ev => {
          setScrollOffset({ x: ev.currentTarget.scrollLeft, y: ev.currentTarget.scrollTop });
        }}
        style={{
          fontSize: 16,
          lineHeight: 1.5,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          color: 'transparent',
          caretColor: '#000',
        }}
        value={text} />
    </div>
    <VerticalSpace space='small' />
    <Button fullWidth onClick={() => emit('SAVE', text)}>
      Save
    </Button>
    <VerticalSpace space='small' />
  </Container>;
}

function FakeText(
  { text, color, colorTonal, scrollOffset }:
    { text: string, color: string, colorTonal: string, scrollOffset: { x: number, y: number } }
) {
  let ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    ref.current.scrollLeft = scrollOffset.x;
    ref.current.scrollTop = scrollOffset.y;
  }, [scrollOffset]);

  return <div
    ref={ref}
    className={styles.fakeText}
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      fontFamily: 'Inter',
      fontSize: 16,
      lineHeight: 1.5,
      padding: '6px 0 6px 8px',
      whiteSpace: 'pre',
      overflow: 'hidden',
      '--mark-color-bg': colorTonal,
      '--mark-color': color,
    }}
    dangerouslySetInnerHTML={{ __html: markupTemplate(text) }} />;
}

function markupTemplate(s: string): string {
  return s
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{(.*?)\}/g, (s) => `<mark>${s}</mark>`);
}

export default render(Plugin)
