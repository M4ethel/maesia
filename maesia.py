from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, send
from flask_migrate import Migrate
from datetime import datetime, timezone
from models import db, Room, Message
import os

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://maesia_db_user:yzfJujNyj5ffYBb984lDNYn0OD74LwQU@dpg-cub6mv1opnds73egu57g-a/maesia_db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "48a49090a5df1c8c9b6b7016b99c7878"
db.init_app(app)
socketio = SocketIO(app)
migrate = Migrate(app, db)

with app.app_context():
    db.create_all()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/rooms", methods=["GET"])
def get_rooms():
    rooms = Room.query.order_by(Room.created_at).all()
    return jsonify([{"id": room.id, "name": room.name} for room in rooms])

@socketio.on("join_room")
def handle_join(data):
    username = data.get("username")
    room_name = data.get("room")

    print(f"Join request received: username={username}, room_name={room_name}")  # Debug log

    if username and room_name:
        room = Room.query.filter_by(name=room_name).first()
        if not room:
            print(f"Room {room_name} does not exist, creating new room.")  # Debug log
            room = Room(name=room_name)
            db.session.add(room)
            db.session.commit()

        join_room(room_name)
        send({"content": f"{username} has joined the room {room_name}"}, to=room_name, include_self=True)
        print(f"Notification sent: {username} has joined {room_name}")  # Debug log

      
        messages = Message.query.filter_by(room_id=room.id).order_by(Message.timestamp).all()
        for msg in messages:
            history = [{
                "username": msg.username, 
                "message": msg.message, 
                "timestamp": msg.timestamp.isoformat(),
                       } for msg in messages
                       ]
            emit("message_history", history, to=request.sid)
    else:
        print("Invalid join_room data received.") 

@socketio.on("send_message")
def handle_message(data):
    print(f"Received send_message: {data}")  # Debug log
    username = data.get("username")
    message = data.get("message")
    room_name = data.get("room")
    sender_id = request.sid

    if username and message and room_name:
        room = Room.query.filter_by(name=room_name).first()
        if not room:
            print(f"Room {room_name} does not exist")  # Debug log
            return

        timestamp = datetime.now(timezone.utc)
        new_message = Message(
            username=username,
            message=message,
            room_id=room.id,
            timestamp=timestamp
        )
        db.session.add(new_message)
        db.session.commit()

        send({
            "username": username,
            "message": message,
            "timestamp": timestamp.isoformat(),
            "senderId": sender_id,
        }, room=room_name, include_self=False)

        print(f"Message from {username}: '{message}' saved to the database.")  

@socketio.on("leave_room")
def handle_leave(data):
    username = data.get("username")
    room_name = data.get("room")
    leave_room(room_name)
    print(f"{username} has left the room {room_name}")  
    send({"content": f"{username} has left the room {room_name}"}, to=room_name)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)


    

