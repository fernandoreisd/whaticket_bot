import React from "react";

import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { Checkbox, ListItemText } from "@material-ui/core";
import { i18n } from "../../translate/i18n";

const TicketsAgentSelect = ({ agents, selectedAgentId = 0, onChange }) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div style={{ width: 120, marginTop: -4 }}>
      <FormControl fullWidth margin="dense">
        <Select
          displayEmpty
          variant="outlined"
          value={selectedAgentId}
          onChange={handleChange}
          MenuProps={{
            anchorOrigin: {
              vertical: "bottom",
              horizontal: "left",
            },
            transformOrigin: {
              vertical: "top",
              horizontal: "left",
            },
            getContentAnchorEl: null,
          }}
          renderValue={() => "Agente"}
        >
          <MenuItem dense key={0} value={0}>
            <Checkbox
              size="small"
              color="primary"
              checked={selectedAgentId === 0}
            />
            <ListItemText primary={"Todos os agentes"} />
          </MenuItem>
          {agents?.length > 0 &&
            agents.map((agent) => (
              <MenuItem dense key={agent.id} value={agent.id}>
                <Checkbox
                  size="small"
                  color="primary"
                  checked={selectedAgentId === agent.id}
                />
                <ListItemText primary={agent.name} />
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </div>
  );
};

export default TicketsAgentSelect;
