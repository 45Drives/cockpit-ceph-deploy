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

let g_core_params = null;


function show_snackbar_msg(msg_label,msg_content,msg_color) {
	var snackbar = document.getElementById("snackbar");
	snackbar.innerHTML = msg_label + msg_content;
	snackbar.style.backgroundColor = msg_color;
	snackbar.className = "show";
	setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 3000);
  } 

function add_host_request(){
	hostname = document.getElementById("new-hostname-field").value;
	monitor_interface = "";
	ip = "";
	if(hostname != null && hostname != ""){
		host_request_json = {[hostname]:{"hostname":""}};
		host_request_json[hostname]["hostname"] = hostname;
		if(ip != null) host_request_json[hostname]["ip"] = ip;
		if(monitor_interface != null) host_request_json[hostname]["monitor_interface"] = monitor_interface;
		var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-h",JSON.stringify(host_request_json),"-w"];
		var result_json = null;
		var proc = cockpit.spawn(spawn_args, {superuser: "require"});
		proc.done(function(data) {
			var msg_label = "";
			var msg_content = "";
			var msg_color = "";
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			if (result_json.hasOwnProperty("success_msg")){
				msg_color = "#20a030";
				msg_label = "Add Host Successful: ";
				msg_content = result_json.success_msg;
			}else{
				msg_color = "#bd3030";
				msg_label = "Error:";
				msg_content = "Unexpected return value.";
			}
			hide_modal_dialog("add-host-modal");
			show_snackbar_msg(msg_label,msg_content,msg_color);
		});
		proc.fail(function(ex, data) {
			document.getElementById("add-host-result-msg").style.display = "block";
			var msg_label = document.getElementById("add-host-result-msg-label");
			msg_label.innerHTML = "Error:";
			var msg_content = document.getElementById("add-host-result-msg-content");
			try {
				result_json = JSON.parse(data);
			} catch (e) {
				msg_content.innerHTML = "Unable to add host";
			}
			if (result_json.hasOwnProperty("error_msg")){
				msg_content.innerHTML = result_json.error_msg;
			}else{
				msg_content.innerHTML = "Unable to add host";
			}
		});
	}
	else{
		return false;
	}

}

function add_host(){
    show_modal_dialog("add-host-modal");
    document.getElementById("new-hostname-field").addEventListener("input",check_host_name);
    document.getElementById("close-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
    document.getElementById("cancel-add-host").addEventListener("click",function(){ hide_modal_dialog("add-host-modal"); });
    document.getElementById("continue-add-host").addEventListener("click",add_host_request);
}

function check_host_name() {
	var host_name = document.getElementById("new-hostname-field").value;
	var button = document.getElementById("continue-add-host");
	var info_message = document.getElementById("new-hostname-field-feedback");
	info_message.innerText = " ";
	if(host_name.length === 0){
		button.disabled = true;
		info_message.innerText = "hostname cannot be empty.";
		return false;
	}else if(!host_name.match(/^[a-z_][a-z0-9_-]*[$]?$/)){
		button.disabled = true;
		var invalid_chars = [];
		if(host_name[0].match(/[^a-z_]/))
			invalid_chars.push("'"+host_name[0]+"'");
		for(let char of host_name.slice(1,-1))
			if(char.match(/[^a-z0-9_-]/))
				invalid_chars.push("'"+char+"'");
		if(host_name[host_name.length - 1].match(/[^a-z0-9_\-$]/))
			invalid_chars.push("'"+host_name[host_name.length - 1]+"'");
		info_message.innerText = "hostname contains invalid characters: " + invalid_chars.join(", ");
		return false;
	}
	button.disabled = false;
	return true;
}

function show_modal_dialog(id){
    var modal = document.getElementById(id);
	modal.style.display = "block";
}

function hide_modal_dialog(id) {
	var modal = document.getElementById(id);
	modal.style.display = "none";
	document.getElementById("add-host-result-msg").style.display = "none";
	document.getElementById("new-hostname-field").value = "";
}

function get_param_file_content(){
	var core_params = null;
	var spawn_args = ["/usr/share/cockpit/ceph-deploy/helper_scripts/core_params","-s"];
	var result_json = null;
	var proc = cockpit.spawn(spawn_args, {superuser: "require"});
	proc.done(function(data) {
		var msg_label = "";
		var msg_content = "";
		var msg_color = "";
		try {
			result_json = JSON.parse(data);
		} catch (e) {
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		if (result_json.hasOwnProperty("success_msg")){
			msg_color = "#20a030";
			msg_label = "Message: ";
			msg_content = result_json.success_msg;
			if(result_json.hasOwnProperty("old_file_content")){
				update_host_info(result_json.old_file_content.hosts);
				core_params = result_json.old_file_content;
			}
		}else{
			msg_color = "#bd3030";
			msg_label = "Error:";
			msg_content = "Unexpected return value.";
		}
		hide_modal_dialog("add-host-modal");
		show_snackbar_msg(msg_label,msg_content,msg_color);
	});
	proc.fail(function(ex, data) {
		var msg_color = "#bd3030";
		var msg_label = "Error:";
		var msg_content = "Unable to load parameter file.";
		show_snackbar_msg(msg_label,msg_content,msg_color);
	});
}

function update_host_info(hosts_json){
	var hostname = "";
	var ip = "";
	var monitor_interface = "";
	var host_list = document.getElementById("cd-host-list");
	if(Object.keys(hosts_json).length > 0){
		while (host_list.hasChildNodes()) {  
			host_list.removeChild(host_list.firstChild);
		}
		
		for (var key of Object.keys(hosts_json)) {
			hostname = hosts_json[key]["hostname"];
			ip = hosts_json[key]["ip"];
			monitor_interface = hosts_json[key]["monitor_interface"];
			
			var new_host_entry = document.createElement("div");
			new_host_entry.classList.add("cd-host-list-entry");

			var host_entry_hostname = document.createElement("div");
			host_entry_hostname.classList.add("cd-host-list-entry-text");
			host_entry_hostname.innerText = hostname;

			var host_entry_ip = document.createElement("div");
			host_entry_ip.classList.add("cd-host-list-entry-text");
			host_entry_ip.innerText = ip;

			var host_entry_monitor_interface = document.createElement("div");
			host_entry_monitor_interface.classList.add("cd-host-list-entry-text");
			host_entry_monitor_interface.innerText = monitor_interface;

			var host_entry_edit_icon = document.createElement("div");
			host_entry_edit_icon.classList.add("cd-host-list-entry-icon");
			host_entry_edit_icon.innerHTML = "&#9881;";

			var host_entry_delete_icon = document.createElement("div");
			host_entry_delete_icon.classList.add("cd-host-list-entry-icon");
			host_entry_delete_icon.innerHTML = "&times";

			new_host_entry.appendChild(host_entry_hostname);
			new_host_entry.appendChild(host_entry_ip);
			new_host_entry.appendChild(host_entry_monitor_interface);
			new_host_entry.appendChild(host_entry_edit_icon);
			new_host_entry.appendChild(host_entry_delete_icon);

			host_list.appendChild(new_host_entry);
		}
	}else{

	}
}

function main()
{
	let root_check = cockpit.permission({ admin: true });
	root_check.addEventListener(
		"changed", 
		function() {
			if(root_check.allowed){
				//user is an administrator, start the module as normal
                //setup on-click listeners for buttons as required.
				get_param_file_content();
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