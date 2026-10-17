"use client";
import {
  BedDouble,
  Building2,
  DoorOpen,
  Footprints,
  ShieldCheck,
} from "lucide-react";
import { rows, text, type Row } from "@/lib/utils";
import "./phase-b.css";
export const mapLabels: Record<string, string> = {
  available: "Available",
  paid: "Occupied · paid",
  pending: "Rent pending",
  unverified: "Unverified billing",
  occupied: "Occupied",
  unavailable: "Unavailable",
};
export function VisualFloorMap({
  rooms,
  floors,
  activeFloor,
  onFloor,
  onRoom,
  financial,
}: {
  rooms: Row[];
  floors: Row[];
  activeFloor: string;
  onFloor: (v: string) => void;
  onRoom: (r: Row) => void;
  financial: boolean;
}) {
  const visible = rooms.filter((r) => r.floor_id === activeFloor);
  const current = floors.find((f) => f.id === activeFloor);
  const split = Math.ceil(visible.length / 2);
  const roomRow = (items: Row[], bottom = false) => (
    <div
      className={`architect-rooms ${bottom ? "architect-rooms-bottom" : ""}`}
      style={{
        gridTemplateColumns: `repeat(${Math.max(split, 1)},minmax(0,1fr))`,
      }}
    >
      {items.map((r) => (
        <button
          key={text(r.id)}
          className={`architect-room map-${text(r.map_status, "available")}`}
          aria-label={`Room ${text(r.number)}`}
          onClick={() => onRoom(r)}
        >
          <span className="architect-room-title">
            <strong>{text(r.number)}</strong>
            <span>{text(r.room_type)}</span>
          </span>
          <span className="architect-room-status">
            {mapLabels[text(r.map_status)] || "Available"}
          </span>
          <span className="architect-beds">
            {rows(r.beds).map((b) => (
              <span
                className={`architect-bed map-${text(b.map_status, "available")}`}
                key={text(b.id)}
                title={`Bed ${text(b.label)}: ${mapLabels[text(b.map_status)] || text(b.status)}`}
              >
                <BedDouble size={19} />
                <small>{text(b.label)}</small>
              </span>
            ))}
          </span>
          <span className="architect-room-foot">
            <b>{text(r.available_beds)} vacant</b>
            <span>{text(r.capacity)} beds</span>
          </span>
          <span className="architect-door" />
        </button>
      ))}
    </div>
  );
  return (
    <section className="architect-map">
      <div className="architect-tabs" aria-label="Choose floor">
        {floors.map((f) => (
          <button
            aria-pressed={activeFloor === f.id}
            className={activeFloor === f.id ? "active" : ""}
            key={text(f.id)}
            onClick={() => onFloor(text(f.id))}
          >
            <Building2 size={14} />
            {text(f.name)}
          </button>
        ))}
      </div>
      <div className="architect-map-heading">
        <div>
          <span className="phase-kicker">LIVE ALLOCATION OVERVIEW</span>
          <h2>{text(current?.name, "Floor overview")}</h2>
          <p>
            {visible.length} rooms ·{" "}
            {visible.reduce((n, r) => n + Number(r.capacity), 0)} beds ·{" "}
            {visible.reduce((n, r) => n + Number(r.available_beds), 0)}{" "}
            available
          </p>
        </div>
        <span>
          <i /> Database connected
        </span>
      </div>
      <div className="architect-scroll">
        <div className="architect-blueprint">
          <div className="architect-compass">N ↑</div>
          {roomRow(visible.slice(0, split))}
          <div className="architect-corridor">
            <span className="architect-stair">
              <Footprints size={19} />
              Staircase / entry
            </span>
            <span>
              <span className="architect-corridor-line" /> CENTRAL CORRIDOR{" "}
              <span className="architect-corridor-line" />
            </span>
            <span className="architect-stair">
              Exit <DoorOpen size={19} />
            </span>
          </div>
          {roomRow(visible.slice(split), true)}
        </div>
      </div>
      {!visible.length && (
        <p className="architect-no-rooms">
          No rooms configured on this floor yet.
        </p>
      )}
      <div className="architect-legend">
        {(financial
          ? ["available", "paid", "pending", "unverified", "unavailable"]
          : ["available", "occupied", "unavailable"]
        ).map((state) => (
          <span key={state}>
            <i className={`map-${state}`} />
            {mapLabels[state]}
          </span>
        ))}
      </div>
      <div className="architect-note">
        <ShieldCheck size={15} />
        <p>
          Schematic layout · Select any room for bed assignments
          {financial ? " and invoice balances" : ""}.
          {financial &&
            " Purple means a pending resident profile or no issued invoice; it does not confirm an unverified payment."}
        </p>
      </div>
    </section>
  );
}
