"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BedDouble, Plus, ShieldCheck } from "lucide-react";
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
import { VisualFloorMap, mapLabels } from "./floor-map";
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
    queryKey: map ? ["rooms", "floor-map"] : ["rooms"],
    queryFn: () => api(map ? "/floor-map" : "/rooms?page_size=100"),
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
            <VisualFloorMap
              rooms={rooms}
              floors={floors}
              activeFloor={activeFloor}
              onFloor={setFloor}
              onRoom={setSelected}
              financial={role === "owner"}
            />
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
            <div className="room-detail-overview">
              <span>
                <strong>{text(selectedCurrent.capacity)}</strong> Total beds
              </span>
              <span>
                <strong>{text(selectedCurrent.available_beds)}</strong>{" "}
                Available
              </span>
              <span>
                <strong>
                  {money(selectedCurrent.monthly_price as number)}
                </strong>{" "}
                Monthly / resident
              </span>
            </div>
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
                  <div className="room-bed-billing">
                    <Badge value={b.status} />
                    {Boolean(b.map_status) && (
                      <small className={`map-text-${text(b.map_status)}`}>
                        {mapLabels[text(b.map_status)]}
                      </small>
                    )}
                    {role === "owner" && b.outstanding !== undefined && (
                      <small>
                        {b.outstanding === null
                          ? "No issued invoice"
                          : `${money(b.outstanding as number)} outstanding`}
                      </small>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="inline-notice">
              <ShieldCheck size={16} /> Every bed has one active resident
              assignment. Room availability updates after allocation.
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
