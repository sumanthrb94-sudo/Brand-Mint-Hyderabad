/**
 * Content calendar — month-view planner for the marketing content engine.
 *
 * Week starts Monday (Indian convention). Drafts, scheduled, and published
 * statuses each render with a distinct chip variant.
 */

import {
  h,
  kpi,
  modal,
  confirm,
  field,
  formToObject,
  bindSubmit,
  renderTopbar,
  dateShort,
} from "/admin/components.js";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(d) {
  return d.toISOString().slice(0, 10);
}
function monthLabel(d) {
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}
function shortMonth(d) {
  return d.toLocaleString("en-IN", { month: "short" });
}

export async function render(ctx) {
  const { db } = ctx;

  let cursor = new Date();
  cursor.setDate(1);

  const root = h("div", {});

  function shiftMonth(n) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);
    redraw();
  }
  function goToday() {
    cursor = new Date();
    cursor.setDate(1);
    redraw();
  }

  function redraw() {
    while (root.firstChild) root.removeChild(root.firstChild);
    const all = db.list("content");
    const ym = cursor.toISOString().slice(0, 7);
    const inMonth = all.filter((p) => (p.date || "").slice(0, 7) === ym);

    const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

    renderTopbar({
      breadcrumb: "MARKETING",
      title: "Content calendar — " + monthLabel(cursor),
      actions: [
        h("button", { class: "btn btn-ghost btn-sm", text: "← " + shortMonth(prev), onclick: () => shiftMonth(-1) }),
        h("button", { class: "btn btn-ghost btn-sm", text: "Today", onclick: goToday }),
        h("button", { class: "btn btn-ghost btn-sm", text: shortMonth(next) + " →", onclick: () => shiftMonth(1) }),
        h("button", { class: "btn btn-primary", text: "+ New post", onclick: () => openForm(null, ymd(new Date())) }),
      ],
    });

    /* KPIs */
    const countBy = (s) => inMonth.filter((p) => p.status === s).length;
    root.appendChild(
      h("div", { class: "kpi-grid" }, [
        kpi({ label: "This month posts", value: String(inMonth.length), delta: null }),
        kpi({ label: "Drafts", value: String(all.filter((p) => p.status === "draft").length), delta: null }),
        kpi({ label: "Scheduled", value: String(all.filter((p) => p.status === "scheduled").length), delta: null }),
        kpi({ label: "Published this month", value: String(countBy("published")), delta: null }),
      ])
    );

    /* Calendar */
    root.appendChild(buildCalendar(all));
  }

  function buildCalendar(allPosts) {
    const grid = h("div", { class: "cal" });

    for (const name of DAY_NAMES) {
      grid.appendChild(h("div", { class: "cal-day-name", text: name }));
    }

    const firstDow = (cursor.getDay() + 6) % 7; // Mon=0
    const start = new Date(cursor);
    start.setDate(1 - firstDow);

    const todayKey = ymd(new Date());
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = ymd(d);
      const otherMonth = d.getMonth() !== cursor.getMonth();
      const isToday = key === todayKey;
      const postsToday = allPosts.filter((p) => p.date === key);

      const cell = h(
        "div",
        {
          class: "cal-day" + (otherMonth ? " other-month" : "") + (isToday ? " today" : ""),
          onclick: () => openForm(null, key),
        },
        [
          h("div", { class: "cal-date", text: String(d.getDate()) }),
          ...postsToday.map((p) =>
            h("div", {
              class: "cal-post" + (p.status === "published" ? " published" : p.status === "scheduled" ? " scheduled" : ""),
              text: p.title,
              title: `${p.channel || ""} · ${p.type || ""} · ${p.status}`,
              onclick: (e) => {
                e.stopPropagation();
                openForm(p);
              },
            })
          ),
        ]
      );
      grid.appendChild(cell);
    }

    return grid;
  }

  function openForm(post, defaultDate) {
    const isNew = !post;
    const data = post || {
      date: defaultDate || ymd(new Date()),
      title: "",
      channel: "LinkedIn",
      type: "Post",
      status: "draft",
    };

    const form = h("form", { class: "vstack", style: { gap: "12px" } });
    form.appendChild(
      h("label", { class: "field has-value" }, [
        h("input", { type: "date", name: "date", value: data.date, required: "required" }),
        h("span", { text: "Date" }),
      ])
    );
    form.appendChild(field({ label: "Title", name: "title", value: data.title, required: true }));
    form.appendChild(
      h("div", { class: "field-row" }, [
        field({
          label: "Channel",
          name: "channel",
          value: data.channel,
        }),
        h("label", { class: "field has-value" }, [
          h("input", {
            type: "text",
            name: "type",
            list: "content-type-suggestions",
            placeholder: "",
            value: data.type || "",
          }),
          h("span", { text: "Type" }),
        ]),
      ])
    );
    form.appendChild(
      h("datalist", { id: "content-type-suggestions" }, [
        "Post",
        "Carousel",
        "Article",
        "Reel",
        "Image",
        "Long-form",
        "Newsletter",
      ].map((v) => h("option", { value: v })))
    );
    form.appendChild(
      field({
        label: "Status",
        name: "status",
        type: "select",
        value: data.status,
        options: [
          { value: "draft", label: "Draft" },
          { value: "scheduled", label: "Scheduled" },
          { value: "published", label: "Published" },
        ],
      })
    );

    const footer = [];
    if (!isNew) {
      footer.push(
        h("button", {
          class: "btn btn-danger",
          type: "button",
          text: "Delete",
          onclick: () =>
            confirm({
              title: "Delete post?",
              message: `"${post.title}" will be removed. This can't be undone.`,
              danger: true,
              onConfirm: () => {
                db.remove("content", post.id);
                instance.close();
                ctx.toast("Post deleted.");
                redraw();
              },
            }),
        })
      );
    }
    footer.push(
      h("button", { class: "btn btn-ghost", type: "button", text: "Cancel", onclick: () => instance.close() }),
      h("button", { class: "btn btn-primary", type: "submit", text: isNew ? "Create" : "Save" })
    );

    const instance = modal({
      title: isNew ? "New post" : "Edit post",
      body: form,
      footer,
    });

    bindSubmit(form, async () => {
      const v = formToObject(form);
      if (!v.title?.trim() || !v.date) {
        ctx.toast("Title and date are required.");
        return;
      }
      if (isNew) {
        await db.createAsync("content", v);
        ctx.toast("Post added.");
      } else {
        await db.updateAsync("content", post.id, v);
        ctx.toast("Saved.");
      }
      instance.close();
      redraw();
    });
  }

  redraw();

  const unsub = db.onTable("content", () => {
    if (root.isConnected) redraw();
    else unsub();
  });

  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (params.get("new") === "1") openForm(null, ymd(new Date()));
  else if (params.get("id")) {
    const p = db.get("content", params.get("id"));
    if (p) openForm(p);
  }

  return root;
}
