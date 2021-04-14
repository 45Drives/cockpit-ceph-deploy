/*
    Cockpit Ceph Deploy - A cockpit module for configuring ceph using 45drives Ansible Playbooks.
    Copyright (C) 2021 Mark Hooper <mhooper@45drives.com>
    
    This file is part of Cockpit Ceph Deploy.
    Cockpit Ceph Deploy is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    Cockpit Ceph Deploy is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with Cockpit Ceph Deploy.  If not, see <https://www.gnu.org/licenses/>.
*/

function verify_add_host(){
    // TODO: perform field varification
    hide_modal_dialog("add_host_modal");
}

function add_host(){
    show_modal_dialog("add_host_modal");
    console.log("add_host CLICKED");
    document.getElementById("cancel-add-host").addEventListener("click",hide_modal_dialog("add_host_modal"));
    document.getElementById("continue-add-host").addEventListener("click",verify_add_host);
}

function show_modal_dialog(id){
    console.log("showing modal dialog: id=" + id);
    var modal = document.getElementById(id);
    console.log(modal);
	modal.style.display = "block";

    var modal_test = document.getElementById("add_host_modal");
    modal_test.style.display = "block";
}

function hide_modal_dialog(id) {
	var modal = document.getElementById(id);
	modal.style.display = "none";
}

function main()
{
	let root_check = cockpit.permission({ admin: true });
	root_check.addEventListener(
		"changed", 
		function() {
			if(root_check.allowed){
				//user is an administrator, start the module as normal
                console.log("ROOT CHECK PASSED")
                //setup on-click listeners for buttons as required.
				document.getElementById("new-host-btn").addEventListener("click",add_host);
			}else{
				//user is not an administrator, inform them of this by
				//displaying a message on each tab page. 
				let page_content = document.getElementById("host_configuration_content");
				page_content.innerHTML = "";
				let user_msg = document.createElement("div");
				user_msg.className = "content_block_msg";
				user_msg.innerHTML = "You must be an administrator to use this feature.";
				page_content.appendChild(user_msg);
			}
	 	}
	)
}

main();

cockpit.transport.wait(function() { });