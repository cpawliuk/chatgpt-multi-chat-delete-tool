// ==UserScript==
// @name         ChatGPT Multi-Chat Delete Tool
// @website      https://github.com/cpawliuk/chatgpt-multi-chat-delete-tool
// @version      1.0
// @description  Script to batch delete messages from ChatGPT.com.
// @author       Christopher Pawliuk
// @match        *://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chatgpt.com
// @grant        none
// ==/UserScript==

addEventListener("load", function () { setTimeout(RunScript, 3000); }); // Set the timeout higher if needed due to the client side delay in loading the components.

function RunScript() {
    const uiStyle = document.createElement('style');

    uiStyle.textContent = `
  .ui-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background-color:rgb(0, 0, 0);
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 12px;
    z-index: 9999;
  }

  .ui-container__button {
    background-color:rgb(255, 255, 255);
    border: none;
    padding: 8px 16px;
    font-size: 14px;
    border-radius: 4px;
    cursor: pointer;
  }

  .ui-container__text {
    font-size: 16px;
    color: #FFFFFF;
  }

  .ui-container__link {
    font-size: 16px;
    color: #FFFFFF !important;
    text-decoration: underline;
  }

  body {
    padding-top: 60px;
  }
`;

    document.head.appendChild(uiStyle);

    const uiContainer = document.createElement('div');
    uiContainer.classList.add('ui-container');

    const uiContainerElements = {
        containerTitleText: document.createElement('div'),
        addUpdateListButton: document.createElement('button'),
        selectAllButton: document.createElement('button'),
        deselectAllButton: document.createElement('button'),
        runScriptButton: document.createElement('button'),
        deleteSelectedChatsButton: document.createElement('button'),
        resetButton: document.createElement('button'),
        backButton: document.createElement('button'),
        settingsButton: document.createElement('button'),
        containerSubTitleText: document.createElement('div'),
        linkTitleText: document.createElement('a'),
        tempTextMessage: document.createElement('div')
    };

    for (const element of Object.values(uiContainerElements)) {
        if (element instanceof HTMLButtonElement) {
            element.classList.add('ui-container__button');
        } else if (element instanceof HTMLDivElement) {
            element.classList.add('ui-container__text');
        } else if (element instanceof HTMLAnchorElement) {
            element.classList.add('ui-container__link');
        }
    }

    uiContainerElements.containerTitleText.textContent = 'ChatGPT Multi-Chat Delete Tool';

    uiContainerElements.addUpdateListButton.textContent = 'Add/Update List';
    uiContainerElements.addUpdateListButton.addEventListener('click', buildChatList);

    uiContainerElements.selectAllButton.textContent = 'Select All (Loaded)';
    uiContainerElements.selectAllButton.addEventListener('click', selectAllItems);

    uiContainerElements.deselectAllButton.textContent = 'Deselect All (Loaded)';
    uiContainerElements.deselectAllButton.addEventListener('click', deselectAllItems);

    uiContainerElements.runScriptButton.textContent = 'Start Deletion';
    uiContainerElements.runScriptButton.addEventListener('click', preRunCheck);
    uiContainerElements.runScriptButton.style.display = 'none';

    uiContainerElements.deleteSelectedChatsButton.textContent = 'Delete Selected';
    uiContainerElements.deleteSelectedChatsButton.addEventListener('click', startDeletingChats);
    uiContainerElements.deleteSelectedChatsButton.style.display = 'none';

    uiContainerElements.resetButton.textContent = 'Reset';
    uiContainerElements.resetButton.addEventListener('click', resetScript);
    uiContainerElements.resetButton.style.display = 'none';

    uiContainerElements.backButton.style.display = 'none';
    uiContainerElements.backButton.textContent = 'Back';
    uiContainerElements.backButton.addEventListener('click', goBack);

    uiContainerElements.settingsButton.textContent = '⚙️';
    uiContainerElements.settingsButton.addEventListener('click', setSettings);

    uiContainerElements.containerSubTitleText.style.whiteSpace = 'pre';
    uiContainerElements.containerSubTitleText.textContent = '||   Deleting . . .   !! Please keep this window and tab in focus !!';
    uiContainerElements.containerSubTitleText.style.display = 'none';

    uiContainerElements.linkTitleText.textContent = 'Visit -> GitHub Repo Page';
    uiContainerElements.linkTitleText.href = 'https://github.com/cpawliuk/chatgpt-multi-chat-delete-tool';
    uiContainerElements.linkTitleText.target = '_blank';
    uiContainerElements.linkTitleText.rel = 'noopener noreferrer';

    uiContainerElements.tempTextMessage.textContent = '';

    for (const element of Object.values(uiContainerElements)) {
        uiContainer.appendChild(element);
    }

    document.body.prepend(uiContainer);

    const chatListLog = document.createElement('div');
    chatListLog.style.display = 'none';
    chatListLog.style.paddingLeft = '16px';

    uiContainer.insertAdjacentElement('afterend', chatListLog);

    const historyElement = document.querySelector('#history');

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && node.matches('a')) {
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.addEventListener('click', e => e.stopPropagation());
                    node.insertBefore(checkbox, node.firstChild);
                }
            }
        }
    });

    observer.observe(historyElement, { childList: true, subtree: true });

    const getChatItems = () => document.querySelectorAll('#history a');

    for (const item of getChatItems()) {
        if (!item.querySelector('input[type="checkbox"]')) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('click', e => e.stopPropagation());
            item.insertBefore(checkbox, item.firstChild);
        }
    }

    let chatList = {};
    let currentRunningTextAnimation = null;
    let clickDelayTimeMS = 2000;

    function delay(timeMS) {
        let setTimeoutID = null;
        let rejectFuncFromPromise = null;

        const myPromise = new Promise((resolve, reject) => {
            rejectFuncFromPromise = reject;
            setTimeoutID = setTimeout(resolve, timeMS);
        });

        return {
            myPromise,
            cancel: () => {
                clearTimeout(setTimeoutID);
                rejectFuncFromPromise(new Error('Aborted'));
            }
        };
    }

    async function displayUITextMessage(message, animationDelayTimeMS = 3000) {
        if (currentRunningTextAnimation) {
            currentRunningTextAnimation.cancel();
        }

        uiContainerElements.tempTextMessage.style.transition = 'none';
        uiContainerElements.tempTextMessage.style.opacity = '0';
        uiContainerElements.tempTextMessage.textContent = message;

        await new Promise(res => setTimeout(res, 20));

        uiContainerElements.tempTextMessage.style.transition = 'opacity 3s ease';
        uiContainerElements.tempTextMessage.style.opacity = '1';

        currentRunningTextAnimation = delay(animationDelayTimeMS);

        try {
            await currentRunningTextAnimation.myPromise;
            uiContainerElements.tempTextMessage.style.opacity = '0';
        } catch (error) {
            //console.log('ABORTED - ANIMATION RESET');
        }
    }

    function setSettings() {
        let enteredSeconds = null;

        do {
            enteredSeconds = prompt(`Wait Time - Set in Seconds - Currently at ${clickDelayTimeMS / 1000} seconds!`, (clickDelayTimeMS / 1000));
            if (enteredSeconds === null) {
                break;
            }
        } while (!/^\d+$/.test(enteredSeconds) || parseInt(enteredSeconds, 10) <= 0);

        if (enteredSeconds !== null) {
            clickDelayTimeMS = parseInt(enteredSeconds, 10) * 1000;
            if (enteredSeconds == 1) {
                displayUITextMessage(`:: Delay Set to ${enteredSeconds} Second ::`);
            } else {
                displayUITextMessage(`:: Delay Set to ${enteredSeconds} Seconds ::`);
            }
        }
    }

    function selectAllItems() {
        for (const item of getChatItems()) {
            const checkbox = item.querySelector('input[type="checkbox"]');

            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
            }
        }
    }

    function deselectAllItems() {
        for (const item of getChatItems()) {
            const checkbox = item.querySelector('input[type="checkbox"]');

            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
            }
        }
    }

    function buildChatList() {
        let itemsAddedCounter = 0;
        let itemsRemovedCounter = 0;

        for (const item of getChatItems()) {
            const checkbox = item.querySelector('input[type="checkbox"]');

            if (!checkbox) {
                continue;
            }

            const title = item.innerText.trim();
            const href = item.href;

            if (checkbox && checkbox.checked) {
                if (!chatList.hasOwnProperty(href)) {
                    //console.log(`${href} for ${title} is checked, added to list. Value = ${href}`);
                    chatList[href] = {
                        title,
                        href
                    };
                    checkbox.classList.add('chat-item__checkbox--marked-for-delete');
                    itemsAddedCounter++;
                }
            } else {
                if (chatList.hasOwnProperty(href)) {
                    //console.log(`${href} for ${title} is unchecked, removed from the list. Value = ${href}`);
                    delete chatList[href];
                    checkbox.classList.remove('chat-item__checkbox--marked-for-delete');
                    itemsRemovedCounter++;
                }
            }
        }

        uiContainerElements.runScriptButton.style.display = Object.keys(chatList).length > 0 ? '' : 'none';

        displayUITextMessage(`:: ${itemsAddedCounter} added :: ${itemsRemovedCounter} removed :: ${Object.keys(chatList).length} total ::`);
    }

    function preRunCheck() {
        const chatItemsForDelete = Array.from(document.getElementsByClassName('chat-item__checkbox--marked-for-delete'));
        console.log("Items that will be deleted:  ", chatItemsForDelete);

        displayUITextMessage(`:: Press F12 for the Console to double check the list ::`);

        for (const item of getChatItems()) {
            const checkbox = item.querySelector('input[type="checkbox"]');

            if (checkbox.checked && !checkbox.classList.contains('chat-item__checkbox--marked-for-delete')) {
                checkbox.checked = false;
            }
        }

        if (Object.keys(chatList).length > 0) {
            uiContainerElements.addUpdateListButton.style.display = 'none';
            uiContainerElements.selectAllButton.style.display = 'none';
            uiContainerElements.deselectAllButton.style.display = 'none';
            uiContainerElements.runScriptButton.style.display = 'none';
            uiContainerElements.deleteSelectedChatsButton.style.display = '';
            uiContainerElements.backButton.style.display = '';
            uiContainerElements.resetButton.style.display = '';
            chatListLog.style.display = '';

            const chatCountText = Object.keys(chatList).length === 1 ? 'Chat' : 'Chats';

            let logTextString = `<b>${Object.keys(chatList).length} ${chatCountText} to be Deleted</b><br>-----------`;

            for (const [href, { title }] of Object.entries(chatList)) {
                logTextString += `<br>${title}`;
            }

            logTextString += `<br>-----------`;

            chatListLog.innerHTML = logTextString;
        }
    }

    function goBack() {
        uiContainerElements.addUpdateListButton.style.display = '';
        uiContainerElements.selectAllButton.style.display = '';
        uiContainerElements.deselectAllButton.style.display = '';
        uiContainerElements.deleteSelectedChatsButton.style.display = 'none';
        uiContainerElements.backButton.style.display = 'none';
        uiContainerElements.resetButton.style.display = 'none';
        chatListLog.style.display = 'none';
    }

    function resetScript() {
        uiContainerElements.containerSubTitleText.style.display = 'none';
        uiContainerElements.addUpdateListButton.style.display = '';
        uiContainerElements.selectAllButton.style.display = '';
        uiContainerElements.deselectAllButton.style.display = '';
        uiContainerElements.deleteSelectedChatsButton.style.display = 'none';
        uiContainerElements.backButton.style.display = 'none';
        uiContainerElements.resetButton.style.display = 'none';
        uiContainerElements.linkTitleText.style.display = '';
        uiContainerElements.tempTextMessage.style.display = '';
        chatListLog.style.display = 'none';

        chatList = {};

        for (const item of getChatItems()) {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
            }
        }
    }

    async function startDeletingChats() {
        uiContainerElements.deleteSelectedChatsButton.style.display = 'none';
        uiContainerElements.backButton.style.display = 'none';
        uiContainerElements.resetButton.style.display = 'none';
        uiContainerElements.settingsButton.style.display = 'none';
        uiContainerElements.linkTitleText.style.display = 'none';
        uiContainerElements.tempTextMessage.style.display = 'none';
        uiContainerElements.containerSubTitleText.style.display = '';

        const chatItemsForDelete = Array.from(document.getElementsByClassName('chat-item__checkbox--marked-for-delete'));
        for (const chatItem of chatItemsForDelete) {
            chatItem.nextElementSibling.nextElementSibling.querySelector('svg').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window }));
            await delay(clickDelayTimeMS).myPromise;
            const chatItemMenu = document.querySelector('[role="menu"]');
            const deleteButtonFromMenu = Array.from(chatItemMenu.querySelectorAll('*')).find(element => element.textContent.trim() === 'Delete');
            deleteButtonFromMenu.click();
            await delay(clickDelayTimeMS).myPromise;
            const itemDialog = document.querySelector('[role="dialog"]');
            const deleteButtonFromDialog = Array.from(itemDialog.querySelectorAll('*')).find(element => element.textContent.trim() === 'Delete');

            if (deleteButtonFromDialog) {
                deleteButtonFromDialog.click();
                await delay(clickDelayTimeMS).myPromise;
            } else {
                return;
            }
        }

        resetScript();
        alert("Complete! Thanks for using the ChatGPT Multi-Chat Delete Tool!");
    }
}