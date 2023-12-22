document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const tasksContainer = document.getElementById('tasks');
    const deleteButtons = document.querySelectorAll('.delete-task');
    const taskCheckboxes = document.querySelectorAll('.task-complete');
    const showCompletedButton = document.getElementById('showCompleted');
    
    taskForm.addEventListener('submit', handleFormSubmit);
    tasksContainer.addEventListener('click', handleDeleteTask);
    tasksContainer.addEventListener('change', handleTaskComplete);
    deleteButtons.forEach(button => button.addEventListener('click', handleDeleteTask));
    taskCheckboxes.forEach(checkbox => checkbox.addEventListener('change', handleTaskComplete));
    tasksContainer.addEventListener('click', handleTaskDetails);
    tasksContainer.addEventListener('click', handleEditTask);
    showCompletedButton.addEventListener('click', handleShowCompleted);

    function handleTaskComplete(event) {
        const taskItem = event.target.parentElement;
        taskItem.classList.toggle('completed');
        const index = taskItem.getAttribute('data-index');
        let tasks = localStorage.getItem('tasks');
        tasks = tasks ? JSON.parse(tasks) : [];
        tasks[index].completed = !tasks[index].completed;
        localStorage.setItem('tasks', JSON.stringify(tasks));
        displayTasks();
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const taskData = Object.fromEntries(new FormData(taskForm));
        try {
            saveTask(taskData);
            displayTasks();
        } catch (error) {
            console.error('Error saving or displaying tasks:', error);
        }
        taskForm.reset();
    }

    function saveTask(task) {
        let tasks = localStorage.getItem('tasks');
        tasks = tasks ? JSON.parse(tasks) : [];
        tasks.push(task);
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function displayTasks(tasks) {
        tasks = tasks || localStorage.getItem('tasks');
        tasks = tasks ? JSON.parse(tasks) : [];
        tasksContainer.innerHTML = '';
        tasks.forEach((task, index) => {
            const taskElement = document.createElement('li');
            taskElement.textContent = `${task.taskName} - ${task.startDate} to ${task.endDate}`;
            taskElement.classList.add('task-item');
            taskElement.setAttribute('data-index', index);
            tasksContainer.appendChild(taskElement);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('task-complete');
            checkbox.checked = task.completed;
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-task');
            const editButton = document.createElement('button');
            editButton.textContent = 'Edit';
            editButton.classList.add('edit-task');
            taskElement.appendChild(editButton);
            taskElement.appendChild(checkbox);
            taskElement.appendChild(deleteButton);
        });
    }

    function handleDeleteTask(event) {
        if (event.target.classList.contains('delete-task')) {
            const taskItem = event.target.parentElement;
            const index = taskItem.getAttribute('data-index');
            let tasks = localStorage.getItem('tasks');
            tasks = tasks ? JSON.parse(tasks) : [];
            tasks.splice(index, 1);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            displayTasks();
            taskItem.remove();
        }
    }

    function handleTaskDetails(event) {
        let taskItem = event.target;
        while (taskItem !== tasksContainer && !taskItem.matches("li.task-item")) {
            taskItem = taskItem.parentElement;
        }
        if (taskItem.matches("li.task-item")) {
            const index = taskItem.getAttribute('data-index');
            displayTaskDetails(JSON.parse(localStorage.getItem('tasks'))[index]);
        }
    }

    function displayTaskDetails(task) {
        const detailsContainer = document.getElementById('taskDetails');
        let htmlContent = `
            <h3>Task Details</h3>
            <p><strong>Name:</strong> ${task.taskName}</p>
            <p><strong>Description:</strong> ${task.taskDescription}</p>
            <p><strong>Start Date:</strong> ${formatDateTime(task.startDate)}</p>
            <p><strong>End Date:</strong> ${formatDateTime(task.endDate)}</p>
            <p><strong>Priority:</strong> ${task.priority}</p>
            <p><strong>Notes:</strong> ${task.additionalNotes || 'None'}</p>
        `;
        if (task.attachedFiles && task.attachedFiles.length > 0) {
            htmlContent += `<p><strong>Attached Files:</strong> ${task.attachedFiles.join(', ')}</p>`;
        }
        detailsContainer.innerHTML = htmlContent;
    }

    function formatDateTime(dateTimeStr) {
        const [date, time] = dateTimeStr.split('T');
        return `${date} Time: ${time}`;
    }

    function handleEditTask(event) {
        const taskItem = event.target.parentElement;
        const index = taskItem.getAttribute('data-index');
        let tasks = localStorage.getItem('tasks');
        tasks = tasks ? JSON.parse(tasks) : [];
        const task = tasks[index];
        taskForm.taskName.value = task.taskName;
        taskForm.startDate.value = task.startDate;
        taskForm.endDate.value = task.endDate;
        taskForm.removeEventListener('submit', handleFormSubmit);
        taskForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const updatedTask = Object.fromEntries(new FormData(taskForm));
            tasks[index] = updatedTask;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            displayTasks();
            taskForm.reset();
            taskForm.removeEventListener('submit', this);
            taskForm.addEventListener('submit', handleFormSubmit);
        });
    }

    function handleShowCompleted() {
        let tasks = localStorage.getItem('tasks');
        tasks = tasks ? JSON.parse(tasks) : [];
        const completedTasks = tasks.filter(task => task.completed);
        displayTasks(completedTasks);
    }

    displayTasks();
});
