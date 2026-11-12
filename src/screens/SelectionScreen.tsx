// Editor de una unidad (o de una opción con sub-opciones): opciones, cantidades, mejoras y ficha.
import { useMemo, useState } from "react";
import { useRoster } from "../data/session";
import type { EntryNode } from "../engine/catalog";
import type { Evaluator, OptionInfo, SelInst } from "../engine/evaluate";
import {
  addSelection,
  attach,
  duplicateSelection,
  PTS,
  removeSelection,
  setNumber,
} from "../engine/ops";
import { datasheet, optionText } from "../engine/profiles";
import { detachments } from "../engine/rules11";
import { splitKeywords } from "../data/glossary";
import { collection, PAINT_STATUS } from "../data/db";
import { usePhotoUrl } from "../data/photos";
import { useTable } from "../data/useTable";
import type { DataIndex } from "../engine/catalog";
import { factionColor } from "../ui/faction";
import { Kw, RichText, useTerm } from "../ui/glossaryUi";
import { Icon, pts, Row, Screen, Section, Spinner, Stepper } from "../ui/kit";
import { useNav } from "../ui/nav";
import { PhotoPicker } from "../ui/photoUi";
import { CollectionItemScreen } from "./CollectionScreen";

export function SelectionScreen(props: {
  rosterUid: string;
  selUid: string;
  back?: string;
}) {
  const { ev, index, update } = useRoster(props.rosterUid);
  const nav = useNav();
  const { show } = useTerm();
  const inst = ev?.findInst(props.selUid);

  const sections = useMemo(
    () => (ev && inst && inst.kind === "sel" ? buildSections(ev, inst) : []),
    [ev, inst],
  );
  const sheet = useMemo(
    () =>
      ev && index && inst && inst.kind === "sel" && inst.parent.kind === "force"
        ? datasheet(index, ev, inst)
        : undefined,
    [ev, index, inst],
  );

  if (!ev || !index) {
    return (
      <Screen title="" large={false}>
        <div className="empty">
          <Spinner />
        </div>
      </Screen>
    );
  }
  if (!inst || inst.kind !== "sel") {
    return (
      <Screen title="Eliminada" back={props.back}>
        <div className="empty">Esta selección ya no está en la lista.</div>
      </Screen>
    );
  }

  const state = ev.stateOf(inst);
  const total = ev.selectionTotal(inst, PTS);
  const isRoot = inst.parent.kind === "force";
  const issues = ev
    .validate()
    .filter(
      (i) =>
        i.targetUid &&
        (i.targetUid === inst.sel.uid || isDescendant(inst, i.targetUid)),
    );
  const assocDefs = isRoot ? ev.associationDefs(inst) : [];
  const leaders = isRoot ? ev.leadersOf(inst) : [];
  const accent = factionColor(
    index.catalogues.get(inst.force.force.catalogueId)?.name,
  );

  const toggle = (
    o: OptionInfo,
    radioGroup?: EntryNode,
    owner: SelInst = inst,
  ) => {
    update((r, idx) => {
      if (o.count > 0) {
        let next = r;
        for (const s of o.selections) next = removeSelection(next, s.sel.uid);
        return next;
      }
      let next = r;
      if (radioGroup) {
        for (const s of owner.children)
          if (s.groups.some((g) => g.key === radioGroup.key))
            next = removeSelection(next, s.sel.uid);
      }
      return addSelection(idx, next, owner.sel.uid, o.node, o.groups).roster;
    });
  };

  const setCount = (o: OptionInfo, n: number, owner: SelInst = inst) => {
    update((r, idx) => {
      if (o.selections[0])
        return setNumber(
          r,
          o.selections[0].sel.uid,
          n - (o.count - o.selections[0].sel.number),
        );
      return addSelection(idx, r, owner.sel.uid, o.node, o.groups, n).roster;
    });
  };

  const openChild = (s: SelInst) =>
    nav.push({
      key: "sel:" + s.sel.uid,
      render: () => (
        <SelectionScreen
          rosterUid={props.rosterUid}
          selUid={s.sel.uid}
          back={state.name}
        />
      ),
    });

  // Mejoras que van en una miniatura de la unidad (p. ej. el Ravener Prime de los Hyperadapted Raveners)
  const childEnhancements = descendants(inst, 2).flatMap((owner) =>
    buildSections(ev, owner)
      .filter((sec) => /enhancement/i.test(sec.title))
      .map((sec) => ({ owner, sec })),
  );

  const renderSection = (
    sec: OptionSection,
    owner: SelInst,
    title = sec.title,
  ) => (
    <Section key={owner.sel.uid + sec.key} header={title} footer={sec.footer}>
      {sec.options.map((o) => {
        const name = o.state.name;
        const price = o.state.costs[PTS]
          ? `+${Math.round(o.state.costs[PTS])}`
          : undefined;
        const child = o.selections[0];
        const drill = child && hasVisibleOptions(ev, child);
        const desc = optionText(index, o.node);
        const descSub = desc ? (
          <span className="opt-desc">
            <RichText text={desc.replace(/\*\*[^*]+\*\*\n/, "")} />
          </span>
        ) : undefined;
        const info = desc ? (
          <button
            className="info-button"
            aria-label={`Qué hace ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              show(name, undefined, { name, description: desc });
            }}
          >
            i
          </button>
        ) : undefined;
        if (sec.radio || (o.max === 1 && sec.max !== 0)) {
          return (
            <Row
              key={o.node.key}
              title={name}
              checked={o.count > 0}
              detail={price}
              sub={descSub}
              className={o.state.hidden && !o.count ? "disabled" : ""}
              onClick={() =>
                o.count > 0 && ((sec.radio && sec.min > 0) || o.min >= o.count)
                  ? drill && openChild(child)
                  : toggle(o, sec.radio ? sec.group : undefined, owner)
              }
              accessory={
                <>
                  {info}
                  {drill ? (
                    <button
                      className="bar-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChild(child);
                      }}
                    >
                      {Icon.chevronRight()}
                    </button>
                  ) : undefined}
                </>
              }
            />
          );
        }
        const groupRoom =
          sec.max >= 0 ? sec.max - sec.count + o.count : Infinity;
        const max = Math.min(o.max >= 0 ? o.max : Infinity, groupRoom);
        return (
          <Row
            key={o.node.key}
            title={name}
            sub={
              price || descSub ? (
                <>
                  {price && `${price} pts`}
                  {descSub}
                </>
              ) : undefined
            }
            accessory={
              <>
                {info}
                <Stepper
                  value={o.count}
                  min={o.min}
                  max={max}
                  onChange={(n) => setCount(o, n, owner)}
                />
              </>
            }
            chevron={drill}
            onClick={drill ? () => openChild(child) : undefined}
          />
        );
      })}
    </Section>
  );

  return (
    <div style={{ "--accent": accent } as React.CSSProperties}>
      <Screen
        title={state.name}
        back={props.back ?? "Lista"}
        subtitle={total ? pts(total) : undefined}
      >
        {isRoot && inst.node.type !== "upgrade" && (
          <CollectionCard
            index={index}
            catalogueId={inst.force.force.catalogueId}
            entryId={inst.node.id}
            name={inst.node.name}
            rosterUid={props.rosterUid}
          />
        )}

        {assocDefs.map((d) => {
          const current = (inst.sel.associations ?? []).find(
            (a) => a.id === d.id,
          )?.target;
          const cands = ev.associationCandidates(inst, d);
          const isSupport = /support/i.test(d.name ?? "");
          return (
            <Section
              key={d.id}
              header={isSupport ? "Apoya a (Support)" : "Lidera a (Leader)"}
              footer={
                isSupport
                  ? "Una unidad de apoyo debe unirse a una de estas unidades."
                  : "Opcional. Cada unidad admite un líder y un apoyo."
              }
            >
              {!isSupport && (
                <Row
                  title="Sin unir"
                  checked={!current}
                  onClick={() =>
                    update((r) => attach(r, inst.sel.uid, d.id, undefined))
                  }
                />
              )}
              {cands.map((c) => {
                const taken = ev
                  .leadersOf(c)
                  .filter(
                    (l) =>
                      l !== inst &&
                      ev
                        .associationDefs(l)
                        .some(
                          (x) => /support/i.test(x.name ?? "") === isSupport,
                        ),
                  );
                return (
                  <Row
                    key={c.sel.uid}
                    title={ev.stateOf(c).name}
                    sub={
                      taken.length
                        ? `Ya lleva ${taken.map((t) => ev.stateOf(t).name).join(", ")}`
                        : undefined
                    }
                    detail={pts(ev.selectionTotal(c, PTS))}
                    checked={current === c.sel.uid}
                    onClick={() =>
                      update((r) =>
                        attach(
                          r,
                          inst.sel.uid,
                          d.id,
                          current === c.sel.uid ? undefined : c.sel.uid,
                        ),
                      )
                    }
                  />
                );
              })}
              {!cands.length && (
                <Row
                  title="No hay unidades válidas en la lista"
                  sub="Añade una de las unidades que puede liderar."
                />
              )}
            </Section>
          );
        })}

        {leaders.length > 0 && (
          <Section header="Unidad adjunta">
            {leaders.map((l) => (
              <Row
                key={l.sel.uid}
                title={ev.stateOf(l).name}
                detail={pts(ev.selectionTotal(l, PTS))}
                chevron
                onClick={() => openChild(l)}
              />
            ))}
          </Section>
        )}

        {issues.length > 0 && (
          <Section>
            {issues.map((i, n) => (
              <Row
                key={n}
                title={i.message}
                icon={Icon.warning(16)}
                iconBg={i.severity === "error" ? "var(--red)" : "var(--orange)"}
              />
            ))}
          </Section>
        )}

        {sections.map((sec) => renderSection(sec, inst))}

        {childEnhancements.map(({ owner, sec }) =>
          renderSection(sec, owner, `${sec.title} · ${ev.stateOf(owner).name}`),
        )}

        {isRoot && <EnhancementHint ev={ev} inst={inst} />}

        {sheet && <DatasheetView sheet={sheet} index={index} />}

        {isRoot && inst.node.type !== "upgrade" && (
          <Section>
            <Row
              title="Duplicar unidad"
              className="action"
              icon={Icon.copy(17)}
              onClick={() => update((r) => duplicateSelection(r, inst.sel.uid))}
            />
            <Row
              title="Eliminar unidad"
              className="action"
              icon={Icon.trash(17)}
              iconBg="var(--red)"
              onClick={() => {
                nav.pop();
                update((r) => removeSelection(r, inst.sel.uid));
              }}
            />
          </Section>
        )}
      </Screen>
    </div>
  );
}

interface OptionSection {
  key: string;
  title: string;
  footer?: string;
  group?: EntryNode;
  radio: boolean;
  min: number;
  max: number;
  count: number;
  options: OptionInfo[];
}

function buildSections(ev: Evaluator, inst: SelInst): OptionSection[] {
  const opts = ev.options(inst).filter((o) => !o.state.hidden || o.count > 0);
  const map = new Map<string, OptionSection>();
  for (const o of opts) {
    const g = o.groups[o.groups.length - 1];
    const key = o.groups.map((x) => x.key).join("/") || "root";
    let sec = map.get(key);
    if (!sec) {
      const info = g ? ev.groupInfo(g, inst, o.groups.slice(0, -1)) : undefined;
      const min = info?.min ?? 0;
      const max = info?.max ?? -1;
      sec = {
        key,
        title: o.groups.map((x) => x.name).join(" › ") || "Opciones",
        group: g,
        radio: max === 1 && !!g,
        min,
        max,
        count: info?.count ?? 0,
        options: [],
        footer: g ? limitsText(min, max, info?.count ?? 0) : undefined,
      };
      map.set(key, sec);
    }
    sec.options.push(o);
  }
  return [...map.values()];
}

function limitsText(
  min: number,
  max: number,
  count: number,
): string | undefined {
  if (max === 1 && min === 1) return "Elige 1.";
  if (max === 1) return "Opcional: elige 1 como máximo.";
  if (min > 0 && max > 0) return `Entre ${min} y ${max} (tienes ${count}).`;
  if (min > 0) return `Al menos ${min} (tienes ${count}).`;
  if (max > 0) return `Hasta ${max} (tienes ${count}).`;
  return undefined;
}

function hasVisibleOptions(ev: Evaluator, s: SelInst): boolean {
  return ev
    .options(s)
    .some(
      (o) =>
        !o.state.hidden &&
        !(o.min === o.max && o.min === o.count && o.max > 0) &&
        !isCrusade(o),
    );
}

function isCrusade(o: OptionInfo) {
  return o.groups.some((g) => /crusade/i.test(g.name));
}

function descendants(inst: SelInst, depth: number): SelInst[] {
  if (depth <= 0) return [];
  return inst.children.flatMap((c) => [c, ...descendants(c, depth - 1)]);
}

function isDescendant(inst: SelInst, uid: string): boolean {
  const stack = [...inst.children];
  while (stack.length) {
    const s = stack.pop()!;
    if (s.sel.uid === uid) return true;
    stack.push(...s.children);
  }
  return false;
}

function DatasheetView({
  sheet,
  index,
}: {
  sheet: ReturnType<typeof datasheet>;
  index: DataIndex;
}) {
  const { show } = useTerm();
  const unitProfiles = sheet.profiles["Unit"] ?? [];
  const weapons = ["Ranged Weapons", "Melee Weapons"];
  const others = Object.keys(sheet.profiles).filter(
    (k) => k !== "Unit" && !weapons.includes(k) && k !== "Abilities",
  );
  const abilities = [
    ...(sheet.profiles["Abilities"] ?? []).map((p) => ({
      name: p.name,
      description: p.characteristics.map((c) => c.value).join(" "),
    })),
    ...sheet.rules,
  ];
  return (
    <>
      {unitProfiles.map((p) => (
        <Section key={p.name} header={p.name}>
          <div className="stats">
            {p.characteristics
              .filter((c) => c.value.trim() !== "")
              .map((c) => (
                <div className="stat" key={c.name}>
                  <b>{c.value}</b>
                  <span>{c.name}</span>
                </div>
              ))}
          </div>
        </Section>
      ))}
      {weapons.map((w) =>
        sheet.profiles[w]?.length ? (
          <Section
            key={w}
            header={
              w === "Ranged Weapons"
                ? "Armas a distancia"
                : "Armas cuerpo a cuerpo"
            }
          >
            <div className="scroll-x">
              <table className="weapons">
                <thead>
                  <tr>
                    <th>Arma</th>
                    {sheet.profiles[w][0].characteristics
                      .filter((c) => c.name !== "Keywords")
                      .map((c) => (
                        <th key={c.name}>{c.name}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.profiles[w].flatMap((p) => {
                    const kw = p.characteristics.find(
                      (c) => c.name === "Keywords",
                    )?.value;
                    const rows = [
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        {p.characteristics
                          .filter((c) => c.name !== "Keywords")
                          .map((c) => (
                            <td key={c.name}>{c.value}</td>
                          ))}
                      </tr>,
                    ];
                    if (kw && kw !== "-")
                      rows.push(
                        <tr key={p.name + ":kw"}>
                          <td className="kw" colSpan={p.characteristics.length}>
                            <span className="kw-list">
                              {splitKeywords(kw).map((k) => (
                                <Kw key={k} term={k} index={index} />
                              ))}
                            </span>
                          </td>
                        </tr>,
                      );
                    return rows;
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null,
      )}
      {abilities.length > 0 && (
        <Section header="Habilidades">
          {abilities.map((a, i) => (
            <button
              className="ability"
              key={a.name + i}
              style={{ display: "block", width: "100%", textAlign: "left" }}
              onClick={() =>
                show(a.name, index, {
                  name: a.name,
                  description: a.description,
                })
              }
            >
              <b>{a.name}</b>
              <RichText
                text={
                  a.description.length > 240
                    ? a.description.slice(0, 240) + "…"
                    : a.description
                }
              />
            </button>
          ))}
        </Section>
      )}
      {others.map((k) => (
        <Section key={k} header={k}>
          {sheet.profiles[k].map((p) => (
            <div className="ability" key={p.name}>
              <b>{p.name}</b>
              {p.characteristics
                .map((c) => `${c.name}: ${c.value}`)
                .join(" · ")}
            </div>
          ))}
        </Section>
      ))}
      {sheet.keywords.length > 0 && (
        <Section header="Palabras clave">
          <div className="keywords kw-list">
            {sheet.keywords.map((k) => (
              <Kw key={k} term={k} index={index} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

function CollectionCard(props: {
  index: DataIndex;
  catalogueId: string;
  entryId: string;
  name: string;
  rosterUid: string;
}) {
  const nav = useNav();
  const key = `${props.catalogueId}:${props.entryId}`;
  const item = useTable("collection", () => collection.get(key), [key]);
  const [shown, setShown] = useState(0);
  const photoIds = item?.photos ?? [];
  const current = photoIds[Math.min(shown, photoIds.length - 1)];
  const url = usePhotoUrl(current);
  const faction = props.index.catalogues.get(props.catalogueId)?.name ?? "";
  const unit = {
    catalogueId: props.catalogueId,
    entryId: props.entryId,
    name: props.name,
    faction,
  };
  const openItem = async () => {
    if (!item) {
      await collection.put({
        key,
        catalogueId: props.catalogueId,
        entryId: props.entryId,
        name: props.name,
        faction,
        owned: 1,
        status: PAINT_STATUS[0],
        notes: "",
        photos: [],
        updatedAt: new Date().toISOString(),
      });
    }
    nav.push({
      key: "col:" + key,
      render: () => <CollectionItemScreen itemKey={key} />,
    });
  };
  return (
    <div className="unit-hero">
      {url ? (
        <button
          className="unit-hero-photo"
          onClick={openItem}
          aria-label="Ver fotos"
        >
          <img src={url} alt={props.name} />
        </button>
      ) : (
        <PhotoPicker
          unit={unit}
          className="unit-hero-photo empty"
          label={`Añadir foto de ${props.name}`}
        >
          {Icon.camera(34)}
          <span>Añade una foto de tu miniatura</span>
        </PhotoPicker>
      )}
      {photoIds.length > 1 && (
        <div className="unit-hero-dots">
          {photoIds.map((p, i) => (
            <button
              key={p}
              className={i === shown ? "on" : ""}
              onClick={() => setShown(i)}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}
      <div className="unit-hero-bar">
        <button className="unit-hero-info" onClick={openItem}>
          <b>
            {item
              ? `Tienes ${item.owned} · ${item.status}`
              : "No está en tu colección"}
          </b>
          <span>
            {item
              ? `${photoIds.length} foto${photoIds.length === 1 ? "" : "s"} · notas y pintura`
              : "Toca para añadirla"}
          </span>
        </button>
        <PhotoPicker unit={unit} className="unit-hero-add">
          {Icon.camera(18)}
          <span>Foto</span>
        </PhotoPicker>
      </div>
    </div>
  );
}

/** Explica por qué un personaje no muestra mejoras */
function EnhancementHint({ ev, inst }: { ev: Evaluator; inst: SelInst }) {
  const cats = inst.node.categoryIds.map(
    (id) => ev.index.categories.get(id)?.name,
  );
  if (
    !cats.includes("Character") &&
    !descendants(inst, 2).some((d) =>
      ev
        .options(d, true)
        .some((o) => o.groups.some((g) => /enhancement/i.test(g.name))),
    )
  )
    return null;
  const enh = [inst, ...descendants(inst, 2)]
    .flatMap((x) => ev.options(x, true))
    .filter((o) => o.groups.some((g) => /enhancement/i.test(g.name)));
  if (enh.some((o) => !o.state.hidden || o.count > 0)) return null;
  const dets = detachments(ev);
  const text = cats.includes("Epic Hero")
    ? "Los HÉROES ÉPICOS no pueden llevar mejoras."
    : !dets.length
      ? "Elige primero un destacamento en la lista: las mejoras dependen de él."
      : `Ninguna mejora de ${dets.map((d) => d.name).join(" / ")} vale para esta unidad: piden otras claves (p. ej. solo para ciertas miniaturas) o BSData aún no las incluye.`;
  return (
    <Section header="Mejoras">
      <div className="rule-text">{text}</div>
    </Section>
  );
}
