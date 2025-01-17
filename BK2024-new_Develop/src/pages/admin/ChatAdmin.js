import React, { useEffect, useState } from 'react';
import { over } from 'stompjs';
import SockJS from 'sockjs-client';
import '../../styles/chat.css';

var stompClient = null;

const ChatAdmin = () => {
    const [privateChats, setPrivateChats] = useState(new Map());
    const [publicChats, setPublicChats] = useState([]);
    const [tab, setTab] = useState("CHATROOM");
    const [userData, setUserData] = useState({
        username: 'admin', // Mặc định tên người dùng là 'admin'
        receivername: '',
        connected: false,
        message: ''
    });

    useEffect(() => {
        console.log(userData);
    }, [userData]);

    const connect = () => {
        let Sock = new SockJS('http://localhost:8080/ws');
        stompClient = over(Sock);
        stompClient.connect({}, onConnected, onError);
    }

    const onConnected = () => {
        setUserData({ ...userData, "connected": true });
        stompClient.subscribe('/chatroom/public', onMessageReceived);
        stompClient.subscribe('/user/' + userData.username + '/private', onPrivateMessage);
        userJoin();
    }

    const userJoin = () => {
        var chatMessage = {
            senderName: userData.username,
            status: "JOIN"
        };
        stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
    }

    const onMessageReceived = (payload) => {
        var payloadData = JSON.parse(payload.body);
        switch (payloadData.status) {
            case "JOIN":
                if (!privateChats.get(payloadData.senderName)) {
                    privateChats.set(payloadData.senderName, []);
                    setPrivateChats(new Map(privateChats));
                }
                break;
            case "MESSAGE":
                publicChats.push(payloadData);
                setPublicChats([...publicChats]);
                break;
        }
    }

    const onPrivateMessage = (payload) => {
        console.log(payload);
        var payloadData = JSON.parse(payload.body);
        if (privateChats.get(payloadData.senderName)) {
            privateChats.get(payloadData.senderName).push(payloadData);
            setPrivateChats(new Map(privateChats));
        } else {
            let list = [];
            list.push(payloadData);
            privateChats.set(payloadData.senderName, list);
            setPrivateChats(new Map(privateChats));
        }
    }

    const onError = (err) => {
        console.log(err);
    }

    const handleMessage = (event) => {
        const { value } = event.target;
        setUserData({ ...userData, "message": value });
    }

    const sendValue = () => {
        if (stompClient) {
            var chatMessage = {
                senderName: userData.username,
                message: userData.message,
                status: "MESSAGE"
            };
            console.log(chatMessage);
            stompClient.send("/app/message", {}, JSON.stringify(chatMessage));
            setUserData({ ...userData, "message": "" });
        }
    }

    const sendPrivateValue = () => {
        if (stompClient) {
            var chatMessage = {
                senderName: userData.username,
                receiverName: tab,
                message: userData.message,
                status: "MESSAGE"
            };

            // Gửi tin nhắn đến kênh riêng tư của người dùng user
            stompClient.send("/app/private-message", {}, JSON.stringify(chatMessage));

            // Cập nhật state của phần tử chat riêng tư
            if (userData.username !== tab) {
                if (privateChats.get(tab)) {
                    privateChats.get(tab).push(chatMessage);
                    setPrivateChats(new Map(privateChats));
                } else {
                    privateChats.set(tab, [chatMessage]);
                    setPrivateChats(new Map(privateChats));
                }
            }

            // Xóa nội dung tin nhắn sau khi gửi
            setUserData({ ...userData, "message": "" });
        }
    }

    const registerUser = () => {
        connect();
    }

    return (
        <>
            <main className="main-content position-relative border-radius-lg ">
                <div className="container">
                    {userData.connected ? (
                        <div className="chat-box">
                            <div className="member-list">
                                <ul>
                                    <li onClick={() => { setTab("CHATROOM") }} className={`member ${tab === "CHATROOM" && "active"}`}>Chatroom</li>
                                    {[...privateChats.keys()].map((name, index) => (
                                        <li onClick={() => { setTab(name) }} className={`member ${tab === name && "active"}`} key={index}>{name}</li>
                                    ))}
                                </ul>
                            </div>
                            {tab === "CHATROOM" && <div className="chat-content">
                                <ul className="chat-messages">
                                    {publicChats.map((chat, index) => (
                                        <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                            {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                                            <div className="message-data">{chat.message}</div>
                                            {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                                        </li>
                                    ))}
                                </ul>

                                <div className="send-message">
                                    <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} />
                                    <button type="button" className="send-button" onClick={sendValue}>send</button>
                                </div>
                            </div>}
                            {tab !== "CHATROOM" && <div className="chat-content">
                                <ul className="chat-messages">
                                    {[...privateChats.get(tab)].map((chat, index) => (
                                        <li className={`message ${chat.senderName === userData.username && "self"}`} key={index}>
                                            {chat.senderName !== userData.username && <div className="avatar">{chat.senderName}</div>}
                                            <div className="message-data">{chat.message}</div>
                                            {chat.senderName === userData.username && <div className="avatar self">{chat.senderName}</div>}
                                        </li>
                                    ))}
                                </ul>

                                <div className="send-message">
                                    <input type="text" className="input-message" placeholder="enter the message" value={userData.message} onChange={handleMessage} />
                                    <button type="button" className="send-button" onClick={sendPrivateValue}>send</button>
                                </div>
                            </div>}
                        </div>
                    ) : (
                        <div className="register">
                            <button type="button" onClick={registerUser}>
                                Connect as admin
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

export default ChatAdmin;