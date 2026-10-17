"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BedDouble,
  Building2,
  DoorOpen,
  Footprints,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { money, rows, text, type Row } from "@/lib/utils";
import {
  Badge,
  Dialog,
  Empty,
  ErrorState,
  FormDialog,
  Loading,
} from "@/components/ui/primitives";
import { PageHeading, usePortal } from "./portal-app";
import { useToast } from "@/components/providers";
export function Rooms({
  map = false,
  personal = false,
}: {
  map?: boolean;
  personal?: boolean;
}) {
  const { role } = usePortal();
  const client = useQueryClient();
  const toast = useToast();
  const [floor, setFloor] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [allocating, setAllocating] = useState(false);
  const [creating, setCreating] = useState(false);
  const q = useQuery({
    queryKey: ["rooms"],
    queryFn: () => api("/rooms?page_size=100"),
  });
  const f = useQuery({
    queryKey: ["floors"],
    queryFn: () => api("/floors"),
    enabled: !personal,
  });
  const s = useQuery({
    queryKey: ["students"],
    queryFn: () => api("/students?page_size=100"),
    enabled: role === "owner" || role === "warden",
  });
  const t = useQuery({
    queryKey: ["room-types"],
    queryFn: () => api("/public/rooms"),
  });
  const rooms = rows(q.data),
    floors = rows(f.data);
  const activeFloor = floor || text(floors[0]?.id, "");
  const visible = map ? rooms.filter((r) => r.floor_id === activeFloor) : rooms;
  const currentFloor = floors.find((r) => r.id === activeFloor);
  const canManage = role === "owner" || role === "warden";
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["rooms"] }),
      client.invalidateQueries({ queryKey: ["floors"] }),
      client.invalidateQueries({ queryKey: ["students"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };
  const selectedCurrent = selected
    ? rooms.find((r) => r.id === selected.id) || selected
    : null;
  const create = async (v: Record<string, string>) => {
    await api("/rooms", { method: "POST", body: JSON.stringify(v) });
    await refresh();
    toast("Room and beds created.");
  };
  const allocate = async (v: Record<string, string>) => {
    await api("/allocations", { method: "POST", body: JSON.stringify(v) });
    await refresh();
    toast("Bed assigned successfully. Availability has been updated.");
    setSelected(null);
  };
  return (
    <>
      <PageHeading
        eyebrow={personal ? "YOUR OWN CORNER" : "SPACE, THOUGHTFULLY ORGANIZED"}
        title={personal ? "My room" : map ? "Floor map" : "Rooms & beds"}
        description={
          personal
            ? "Everything you need to know about your room."
            : map
              ? "An intuitive, live view of every room and every bed."
              : "Keep every room, bed, and allocation in perfect order."
        }
      >
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Add room
          </button>
        )}
      </PageHeading>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : !rooms.length ? (
        <Empty
          title={personal ? "Your room is being prepared" : "No rooms yet"}
          description={
            personal
              ? "Your assigned room will appear once management completes your allocation."
              : "Create a room to get your floor plan started."
          }
        />
      ) : (
        <>
          {!personal && (
            <div className="stats-inline">
              <section className="surface">
                <span>Total rooms</span>
                <strong>{rooms.length}</strong>
              </section>
              <section className="surface">
                <span>Occupied beds</span>
                <strong>
                  {rooms.reduce(
                    (sum, r) => sum + Number(r.occupied_beds || 0),
                    0,
                  )}
                </strong>
              </section>
              <section className="surface">
                <span>Available beds</span>
                <strong>
                  {rooms.reduce(
                    (sum, r) => sum + Number(r.available_beds || 0),
                    0,
                  )}
                </strong>
              </section>
            </div>
          )}
          {map ? (
            <>
              <div className="floor-toolbar">
                <div className="floor-tabs" aria-label="Choose floor">
                  {floors.map((v) => (
                    <button
                      key={text(v.id)}
                      className={activeFloor === v.id ? "active" : ""}
                      onClick={() => setFloor(text(v.id))}
                    >
                      {text(v.name)}
                    </button>
                  ))}
                </div>
                <div className="floor-legend">
                  <span>
                    <i style={{ background: "#4bb586" }} />
                    Vacant
                  </span>
                  <span>
                    <i style={{ background: "#72a3e2" }} />
                    Occupied
                  </span>
                  <span>
                    <i style={{ background: "#d6a260" }} />
                    Maintenance
                  </span>
                </div>
              </div>
              <section className="surface floor-plan">
                <div className="floor-plan-header">
                  <div>
                    <h3>{text(currentFloor?.name, "Floor overview")}</h3>
                    <p>
                      {visible.length} rooms ·{" "}
                      {visible.reduce(
                        (sum, r) => sum + Number(r.available_beds || 0),
                        0,
                      )}{" "}
                      beds available
                    </p>
                  </div>
                  <span>
                    <Building2 size={13} /> LIVE FLOOR PLAN
                  </span>
                </div>
                <div className="floor-rooms">
                  {visible.map((r) => (
                    <button
                      key={text(r.id)}
                      aria-label={`Room ${text(r.number)}`}
                      className="floor-room"
                      onClick={() => setSelected(r)}
                    >
                      <strong>ROOM {text(r.number)}</strong>
                      <small>
                        {text(r.room_type)} · {money(r.monthly_price as number)}
                      </small>
                      <div className="bed-grid">
                        {rows(r.beds).map((b) => (
                          <span
                            key={text(b.id)}
                            className={`bed-icon ${b.status === "occupied" ? "occupied" : b.status === "maintenance" ? "maintenance" : ""}`}
                            title={`Bed ${text(b.label)}: ${text(b.status)}`}
                          >
                            <BedDouble size={19} />
                          </span>
                        ))}
                      </div>
                      <small>
                        {text(r.available_beds)} vacant / {text(r.capacity)}{" "}
                        beds
                      </small>
                    </button>
                  ))}
                </div>
                <div className="floor-corridor">
                  <span>
                    <Footprints size={16} /> STAIRCASE / ENTRY
                  </span>
                  <span>CENTRAL CORRIDOR</span>
                  <span>
                    EXIT <DoorOpen size={16} />
                  </span>
                </div>
                <p className="floor-plan-note">
                  Schematic layout · Select a room to view its beds and manage
                  allocations.
                </p>
              </section>
            </>
          ) : (
            <div className="room-cards">
              {visible.map((r) => (
                <article key={text(r.id)} className="surface room-card">
                  <div className="room-card-top">
                    <span>
                      <BedDouble size={23} />
                    </span>
                    <Badge value={r.status} />
                  </div>
                  <h3>Room {text(r.number)}</h3>
                  <p>
                    {text(r.floor_name)} · {text(r.room_type)} accommodation
                  </p>
                  <div className="bed-grid">
                    {rows(r.beds).map((b) => (
                      <span
                        key={text(b.id)}
                        className={`bed-icon ${b.status === "occupied" ? "occupied" : ""}`}
                        title={`Bed ${text(b.label)}: ${text(b.status)}`}
                      >
                        <BedDouble size={19} />
                      </span>
                    ))}
                  </div>
                  <div className="room-card-bottom">
                    <strong>
                      {money(r.monthly_price as number)} <small>/ month</small>
                    </strong>
                    <button
                      className="inline-action"
                      onClick={() => setSelected(r)}
                    >
                      View room <ArrowRight size={13} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {selectedCurrent && !allocating && (
        <Dialog
          title={`Room ${text(selectedCurrent.number)}`}
          description={`${text(selectedCurrent.floor_name)} · ${text(selectedCurrent.room_type)} · ${money(selectedCurrent.monthly_price as number)} per student / month`}
          onClose={() => setSelected(null)}
        >
          <div className="dialog-body">
            <div className="bed-detail-list">
              {rows(selectedCurrent.beds).map((b) => (
                <div key={text(b.id)} className="bed-detail">
                  <BedDouble size={23} />
                  <div>
                    <strong>Bed {text(b.label)}</strong>
                    <small>
                      {text(
                        b.student_name,
                        b.status === "occupied"
                          ? "Occupied"
                          : "Ready for move-in",
                      )}
                    </small>
                  </div>
                  <Badge value={b.status} />
                </div>
              ))}
            </div>
            <div className="inline-notice">
              <ShieldCheck size={16} /> Allocations use database constraints to
              keep each bed and resident assignment unique.
            </div>
            {canManage && (
              <div className="dialog-actions">
                <button
                  className="btn btn-primary"
                  disabled={
                    !rows(selectedCurrent.beds).some(
                      (b) => b.status === "available",
                    )
                  }
                  onClick={() => setAllocating(true)}
                >
                  <Plus size={16} /> Assign bed
                </button>
              </div>
            )}
          </div>
        </Dialog>
      )}
      {allocating && selectedCurrent && (
        <FormDialog
          title="Assign a bed"
          description={`Room ${text(selectedCurrent.number)}. Booking approval and bed allocation are separate steps.`}
          fields={[
            {
              name: "student_id",
              label: "Student",
              type: "select",
              required: true,
              options: rows(s.data)
                .filter((r) => !r.room_number)
                .map((r) => ({
                  value: text(r.id),
                  label: `${text(r.full_name)} · ${text(r.email)}`,
                })),
            },
            {
              name: "bed_id",
              label: "Bed",
              type: "select",
              required: true,
              options: rows(selectedCurrent.beds)
                .filter((b) => b.status === "available")
                .map((b) => ({
                  value: text(b.id),
                  label: `Bed ${text(b.label)}`,
                })),
            },
          ]}
          submitLabel="Assign bed"
          onSubmit={allocate}
          onClose={() => setAllocating(false)}
        />
      )}{" "}
      {creating && (
        <FormDialog
          title="Add a room"
          description="Bed capacity is inherited from the selected room category."
          fields={[
            { name: "number", label: "Room number", required: true },
            {
              name: "floor_id",
              label: "Floor",
              type: "select",
              required: true,
              options: floors.map((r) => ({
                value: text(r.id),
                label: text(r.name),
              })),
            },
            {
              name: "room_type_id",
              label: "Room type",
              type: "select",
              required: true,
              options: rows(t.data).map((r) => ({
                value: text(r.id),
                label: `${text(r.name)} · ${money(r.monthly_price as number)}`,
              })),
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              required: true,
              options: ["available", "maintenance", "inactive"].map((v) => ({
                value: v,
                label: v,
              })),
            },
          ]}
          defaults={{ status: "available" }}
          submitLabel="Create room"
          onSubmit={create}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
