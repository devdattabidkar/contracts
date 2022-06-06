//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Heritage is Ownable {
    event NewTestator(
        address inheritor,
        Status status,
        uint256 proofOfTimestamp,
        address token,
        uint16 maxDays
    );

    event ProofUpdated(address testator, uint256 timestamp);

    event Inherited(address _testator, address _inheritor, uint256 _balance);

    event Revoke(
        address inheritor,
        Status status,
        uint256 proofOfTimestamp,
        address token,
        uint16 maxDays
    );

    enum Status {
        ACTIVE,
        INACTIVE,
        INHERITED
    }

    struct Testator {
        address inheritor;
        Status status;
        uint256 proofOfTimestamp;
        address token;
        uint16 maxDays;
    }

    mapping(address => Testator) private testators;
    mapping(address => address) private inheritorToTestator;

    modifier onlyTestator() {
        require(
            testators[msg.sender].inheritor != address(0),
            "The address is not a valid testator."
        );
        _;
    }

    modifier onlyActive() {
        require(
            testators[msg.sender].status == Status.ACTIVE,
            "The address holder is not active."
        );
        _;
    }

    modifier onlyInheritor() {
        require(
            inheritorToTestator[msg.sender] != address(0),
            "The address is not a valid inheritor."
        );
        _;
    }

    modifier timeAlreadyPassed() {
        Testator storage _testator = testators[inheritorToTestator[msg.sender]];
        uint256 _timestamp = block.timestamp;

        require(
            _timestamp >=
                _testator.proofOfTimestamp + _testator.maxDays * 1 days,
            "The max days did not passed yet."
        );
        _;
    }

    modifier greaterThan(uint16 _maxDays) {
        require(_maxDays > 0, "maxDays should be greater than 0.");
        _;
    }

    modifier uniqueTestator() {
        require(
            testators[msg.sender].inheritor == address(0),
            "Testator already have a testament."
        );
        _;
    }

    function addTestator(
        address _inheritor,
        address _token,
        uint16 _maxDays
    ) public greaterThan(_maxDays) uniqueTestator {
        require(
            inheritorToTestator[_inheritor] == address(0),
            "Inheritor already have a testament."
        );

        IERC20 token = IERC20(_token);

        uint256 _allowance = token.allowance(msg.sender, address(this));

        require(_allowance > 0, "Token allowance should be greater than 0.");

        Testator memory _testator = Testator(
            _inheritor,
            Status.ACTIVE,
            block.timestamp,
            _token,
            _maxDays
        );

        testators[msg.sender] = _testator;

        inheritorToTestator[_inheritor] = msg.sender;

        emit NewTestator(
            _testator.inheritor,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays
        );
    }

    function getTestator(address _testatorAddress)
        public
        view
        returns (
            address,
            Status,
            uint256,
            address,
            uint16
        )
    {
        Testator memory _testator = testators[_testatorAddress];

        require(
            _testator.inheritor != address(0x00),
            "The testator does not exist."
        );

        return (
            _testator.inheritor,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays
        );
    }

    function updateProof() public onlyTestator onlyActive returns (bool) {
        uint256 _timestamp = block.timestamp;

        Testator storage _testator = testators[msg.sender];

        if (
            _timestamp >=
            _testator.proofOfTimestamp + _testator.maxDays * 1 days
        ) {
            _testator.status = Status.INACTIVE;

            return false;
        }

        _testator.proofOfTimestamp = _timestamp;

        emit ProofUpdated(msg.sender, _timestamp);

        return true;
    }

    function inherit() public onlyInheritor timeAlreadyPassed {
        Testator storage _testator = testators[inheritorToTestator[msg.sender]];

        IERC20 token = IERC20(_testator.token);
        uint256 _balance = token.balanceOf(inheritorToTestator[msg.sender]);

        token.transferFrom(
            inheritorToTestator[msg.sender],
            msg.sender,
            _balance
        );

        _testator.status = Status.INHERITED;

        emit Inherited(inheritorToTestator[msg.sender], msg.sender, _balance);
    }

    function revoke() public onlyTestator onlyActive {
        Testator memory _testator = testators[msg.sender];

        delete inheritorToTestator[_testator.inheritor];
        delete testators[msg.sender];

        emit Revoke(
            _testator.inheritor,
            _testator.status,
            _testator.proofOfTimestamp,
            _testator.token,
            _testator.maxDays
        );
    }
}
