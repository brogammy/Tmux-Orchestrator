#!/usr/bin/env python3
"""
Message Bus for Inter-Agency Communication

Handles routing and delivery of messages between agencies,
maintains message queue, and ensures reliable delivery.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import uuid

class MessageBus:
    """Central message routing and delivery system for agencies."""

    def __init__(self, registry_path: str = "registry"):
        self.registry_path = Path(registry_path)
        self.queue_file = self.registry_path / "message_queue.json"
        self.agencies_file = self.registry_path / "active_agencies.json"

    def _load_queue(self) -> Dict:
        """Load message queue from file."""
        if not self.queue_file.exists():
            return {"messages": [], "last_updated": None, "version": "1.0"}
        with open(self.queue_file, 'r') as f:
            return json.load(f)

    def _save_queue(self, queue: Dict):
        """Save message queue to file."""
        queue["last_updated"] = datetime.now().isoformat()
        with open(self.queue_file, 'w') as f:
            json.dump(queue, f, indent=2)

    def _load_agencies(self) -> Dict:
        """Load active agencies from registry."""
        if not self.agencies_file.exists():
            return {"agencies": [], "last_updated": None, "version": "1.0"}
        with open(self.agencies_file, 'r') as f:
            return json.load(f)

    def send_message(self, from_agency: str, to_agency: str,
                    msg_type: str, payload: Dict, priority: str = "medium") -> str:
        """
        Send a message from one agency to another.

        Args:
            from_agency: Source agency name
            to_agency: Destination agency name
            msg_type: Type of message (handoff, request, response, alert, broadcast)
            payload: Message payload (dict)
            priority: Message priority (high, medium, low)

        Returns:
            Message ID
        """
        queue = self._load_queue()

        msg_id = f"msg-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"

        message = {
            "id": msg_id,
            "timestamp": datetime.now().isoformat(),
            "from_agency": from_agency,
            "to_agency": to_agency,
            "priority": priority,
            "type": msg_type,
            "payload": payload,
            "status": "pending",
            "delivered_at": None,
            "acknowledged_at": None
        }

        queue["messages"].append(message)
        self._save_queue(queue)

        print(f"✓ Message {msg_id} sent from {from_agency} to {to_agency}")
        return msg_id

    def get_messages(self, agency: str, status: Optional[str] = None) -> List[Dict]:
        """
        Get all messages for an agency.

        Args:
            agency: Agency name
            status: Optional filter by status (pending, delivered, acknowledged)

        Returns:
            List of messages
        """
        queue = self._load_queue()
        messages = [
            msg for msg in queue["messages"]
            if msg["to_agency"] == agency
        ]

        if status:
            messages = [msg for msg in messages if msg["status"] == status]

        return messages

    def mark_delivered(self, msg_id: str):
        """Mark a message as delivered."""
        queue = self._load_queue()
        for msg in queue["messages"]:
            if msg["id"] == msg_id:
                msg["status"] = "delivered"
                msg["delivered_at"] = datetime.now().isoformat()
                break
        self._save_queue(queue)

    def mark_acknowledged(self, msg_id: str):
        """Mark a message as acknowledged."""
        queue = self._load_queue()
        for msg in queue["messages"]:
            if msg["id"] == msg_id:
                msg["status"] = "acknowledged"
                msg["acknowledged_at"] = datetime.now().isoformat()
                break
        self._save_queue(queue)

    def broadcast(self, from_agency: str, msg_type: str, payload: Dict, priority: str = "high") -> List[str]:
        """
        Broadcast a message to all active agencies.

        Returns:
            List of message IDs
        """
        agencies_data = self._load_agencies()
        active_agencies = [a["name"] for a in agencies_data["agencies"]]

        msg_ids = []
        for agency in active_agencies:
            if agency != from_agency:  # Don't send to self
                msg_id = self.send_message(from_agency, agency, msg_type, payload, priority)
                msg_ids.append(msg_id)

        print(f"✓ Broadcast sent to {len(msg_ids)} agencies")
        return msg_ids

    def get_pending_count(self, agency: str) -> int:
        """Get count of pending messages for an agency."""
        return len(self.get_messages(agency, status="pending"))

    def clear_old_messages(self, days: int = 7):
        """Clear messages older than specified days."""
        queue = self._load_queue()
        cutoff = datetime.now().timestamp() - (days * 24 * 60 * 60)

        queue["messages"] = [
            msg for msg in queue["messages"]
            if datetime.fromisoformat(msg["timestamp"]).timestamp() > cutoff
        ]

        self._save_queue(queue)
        print(f"✓ Cleared messages older than {days} days")

    def show_message(self, msg_id: str):
        """Display a message in formatted output."""
        queue = self._load_queue()
        msg = next((m for m in queue["messages"] if m["id"] == msg_id), None)

        if not msg:
            print(f"Message {msg_id} not found")
            return

        print(f"\n{'='*60}")
        print(f"Message ID: {msg['id']}")
        print(f"From: {msg['from_agency']} → To: {msg['to_agency']}")
        print(f"Type: {msg['type']} | Priority: {msg['priority']} | Status: {msg['status']}")
        print(f"Timestamp: {msg['timestamp']}")
        print(f"{'-'*60}")
        print(f"Payload:")
        print(json.dumps(msg['payload'], indent=2))
        print(f"{'='*60}\n")


def main():
    """CLI interface for message bus."""
    import sys

    if len(sys.argv) < 2:
        print("Usage:")
        print("  message_bus.py send <from> <to> <type> <payload_json> [priority]")
        print("  message_bus.py get <agency> [status]")
        print("  message_bus.py show <msg_id>")
        print("  message_bus.py broadcast <from> <type> <payload_json> [priority]")
        print("  message_bus.py pending <agency>")
        print("  message_bus.py deliver <msg_id>")
        print("  message_bus.py ack <msg_id>")
        sys.exit(1)

    bus = MessageBus()
    command = sys.argv[1]

    if command == "send":
        from_agency = sys.argv[2]
        to_agency = sys.argv[3]
        msg_type = sys.argv[4]
        payload = json.loads(sys.argv[5])
        priority = sys.argv[6] if len(sys.argv) > 6 else "medium"
        msg_id = bus.send_message(from_agency, to_agency, msg_type, payload, priority)
        print(f"Message ID: {msg_id}")

    elif command == "get":
        agency = sys.argv[2]
        status = sys.argv[3] if len(sys.argv) > 3 else None
        messages = bus.get_messages(agency, status)
        print(f"\nMessages for {agency} ({len(messages)} total):")
        for msg in messages:
            print(f"  [{msg['status']}] {msg['id']}: {msg['from_agency']} → {msg['type']}")

    elif command == "show":
        msg_id = sys.argv[2]
        bus.show_message(msg_id)

    elif command == "broadcast":
        from_agency = sys.argv[2]
        msg_type = sys.argv[3]
        payload = json.loads(sys.argv[4])
        priority = sys.argv[5] if len(sys.argv) > 5 else "high"
        msg_ids = bus.broadcast(from_agency, msg_type, payload, priority)
        print(f"Broadcast message IDs: {', '.join(msg_ids)}")

    elif command == "pending":
        agency = sys.argv[2]
        count = bus.get_pending_count(agency)
        print(f"{agency} has {count} pending messages")

    elif command == "deliver":
        msg_id = sys.argv[2]
        bus.mark_delivered(msg_id)
        print(f"Message {msg_id} marked as delivered")

    elif command == "ack":
        msg_id = sys.argv[2]
        bus.mark_acknowledged(msg_id)
        print(f"Message {msg_id} marked as acknowledged")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
