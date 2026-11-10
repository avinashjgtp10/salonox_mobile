/**
 * Minimal Markdown for Lunox answers: paragraphs, **bold**, headings, bullet / numbered
 * lists and tables (the server formats rankings and comparisons as Markdown tables).
 */
import { Fragment, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { pearl } from "@/components/auth/pearl/tokens";
import { Text } from "@/components/ui/AppTypography";
import { isInvalidLunoxReply, LUNOX_INVALID_REPLY } from "@/utils/lunoxReply";

type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "li"; marker: string; text: string }
  | { kind: "table"; header: string[]; rows: string[][] };

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
const isSeparator = (line: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim());

function parse(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { flush(); continue; }

    if (trimmed.startsWith("|")) {
      flush();
      const table: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) table.push(lines[i++]);
      i--;
      const rows = table.filter(row => !isSeparator(row)).map(cells);
      if (rows.length) blocks.push({ kind: "table", header: rows[0], rows: rows.slice(1) });
      continue;
    }
    const heading = trimmed.match(/^#{1,4}\s+(.*)$/);
    if (heading) { flush(); blocks.push({ kind: "h", text: heading[1] }); continue; }
    const item = trimmed.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      blocks.push({ kind: "li", marker: /^\d/.test(item[1]) ? item[1].replace(")", ".") : "•", text: item[2] });
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

/** **bold** → bold text; *italic* and `code` markers are dropped. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <Text key={index} style={styles.bold}>{part.slice(2, -2)}</Text>
      : <Fragment key={index}>{part.replace(/(^|[^*])\*([^*]+)\*/g, "$1$2").replace(/`([^`]+)`/g, "$1")}</Fragment>);
}

export function LunoxMarkdown({ text }: { text: string }) {
  const blocks = parse(isInvalidLunoxReply(text) ? LUNOX_INVALID_REPLY : text);
  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => {
        if (block.kind === "h") return <Text key={index} style={[styles.text, styles.bold]}>{inline(block.text)}</Text>;
        if (block.kind === "li") {
          return (
            <View key={index} style={styles.item}>
              <Text style={[styles.text, styles.marker]}>{block.marker}</Text>
              <Text style={[styles.text, { flex: 1 }]}>{inline(block.text)}</Text>
            </View>
          );
        }
        if (block.kind === "table") {
          return (
            <View key={index} style={styles.table}>
              <View style={[styles.row, styles.headRow]}>
                {block.header.map((cell, c) => <Text key={c} style={[styles.headCell, c === 0 && styles.firstCell]} numberOfLines={2}>{inline(cell)}</Text>)}
              </View>
              {block.rows.map((row, r) => (
                <View key={r} style={[styles.row, r > 0 && styles.rowSep]}>
                  {row.map((cell, c) => <Text key={c} style={[styles.cell, c === 0 && styles.firstCell]}>{inline(cell)}</Text>)}
                </View>
              ))}
            </View>
          );
        }
        return <Text key={index} style={styles.text}>{inline(block.text)}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  // .bubble: 13.5px, line-height 1.45
  text: { fontSize: 13.5, lineHeight: 19.5, fontWeight: "500", color: pearl.ink },
  bold: { fontWeight: "800", color: pearl.ink },
  item: { flexDirection: "row", gap: 6, marginTop: -6 },
  marker: { minWidth: 14, fontWeight: "700", color: pearl.accentDeep },
  // Rows styled like the prototype's .mini-stats tiles
  table: { borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(238,236,246,0.7)" },
  row: { flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingVertical: 7 },
  headRow: { backgroundColor: "rgba(231,222,246,0.7)" },
  rowSep: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.8)" },
  headCell: { flex: 1, fontSize: 10.5, lineHeight: 14, fontWeight: "600", color: pearl.muted, textAlign: "right" },
  cell: { flex: 1, fontSize: 13, lineHeight: 17, fontWeight: "700", color: pearl.ink, textAlign: "right" },
  firstCell: { flex: 1.4, textAlign: "left" },
});
